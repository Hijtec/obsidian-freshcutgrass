import { Plugin, Notice, Setting, PluginSettingTab, App, TFile, normalizePath } from "obsidian";
import * as http from "http";
import * as yaml from "js-yaml";

declare global {
	interface Window {
		FCG?: {
			createAdversary?: (payload: any) => Promise<any> | void;
			getAdversaries?: () => Promise<any> | void;
		};
	}
}

interface FreshCutGrassSettings {
	importFolder: string;
	statblockLayoutName: string;
	serverPort: string;
	fileNamingBehavior: "override" | "suffix";
}
const DEFAULT_SETTINGS: FreshCutGrassSettings = {
	importFolder: "Adversaries/FCG",
	statblockLayoutName: "default",
	serverPort: "27123",
	fileNamingBehavior: "suffix",
};

export default class FreshCutGrassPlugin extends Plugin {
	private server: http.Server | null = null;
	private readonly PORT = 27123;
	settings: FreshCutGrassSettings;

	private pendingCommand: null | {
		type: "create" | "readAll" | "readLibrary" | "readById" | "updateById" | "deleteById",
		payload?: any
	} = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FreshCutGrassSettingTab(this.app, this));

		this.addCommand({
			id: "fcg-import-all-adversaries-and-environments",
			name: "Fresh Cut Grass: Import All Adversaries And Environments",
			callback: () => {
				this.pendingCommand = { type: "readAll" };
				new Notice("FCG: Asking browser for adversaries…");
			}
		});

		this.addCommand({
			id: "fcg-import-library-adversaries",
			name: "Fresh Cut Grass: Import Library Adversaries",
			callback: () => {
				this.pendingCommand = { type: "readLibrary" };
				new Notice("FCG: Asking browser for library adversaries…");
			}
		});

		this.addCommand({
			id: "fcg-export-current-note-adversary",
			name: "Fresh Cut Grass: Export current note adversary to FCG",
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice("No file open");
					return;
				}

				const content = await this.app.vault.read(file);

				// ✔ Extract YAML inside statblock fence ONLY
				const match = content.match(/```statblock[\s\S]*?\n([\s\S]*?)```/);
				const yamlOnly = match ? match[1] : "";

				if (!yamlOnly) {
					new Notice("No statblock found in current note");
					return;
				}

				const payload = parseYamlStatblock(yamlOnly);

				this.pendingCommand = { type: "create", payload };
				new Notice("FCG: Sending adversary to browser…");
			}
		});

		this.startServer();
		new Notice("FreshCutGrass plugin loaded");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private startServer() {
		this.server = http.createServer((req, res) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");


			if (req.method === "OPTIONS") {
				res.writeHead(204).end();
				return;
			}

			// Browser polling for commands
			if (req.url === "/fcg/command" && req.method === "GET") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(this.pendingCommand));
				this.pendingCommand = null;
				return;
			}

			if (req.url !== "/fcg") {
				res.writeHead(404).end();
				return;
			}

			if (req.method === "GET") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true }));
				return;
			}

			let body = "";
			req.on("data", c => body += c);
			req.on("end", async () => {
				const msg = JSON.parse(body);
				if (Array.isArray(msg.data)) handleIncomingData(this, msg.data);
				res.writeHead(200).end("ok");
			});
		});

		this.server.listen(this.PORT, "127.0.0.1");
	}
}

async function handleIncomingData(plugin: FreshCutGrassPlugin, data: any[]) {
	const usedPaths = new Set<string>();

	for (const item of data) {
		const yaml = jsonToYaml(item);
		const content = `---
statblock: inline
obsidianUIMode: preview
---

# Statblock

\`\`\`statblock
layout: ${plugin.settings.statblockLayoutName}
${yaml}
\`\`\``;
		const nameSafe = item.name.replace(/[\\\/:*?"<>|]/g, "_");
		const folder = plugin.settings.importFolder?.trim() ?? "";
		const basePath = folder
			? `${folder}/${nameSafe}`
			: `${nameSafe}`;

		let targetPath = normalizePath(`${basePath}.md`);

		if (plugin.settings.fileNamingBehavior === "suffix") {
			// Always create new file, never override

			let i = 0;
			let candidatePath = targetPath;

			while (
				plugin.app.vault.getAbstractFileByPath(candidatePath) ||
				usedPaths.has(candidatePath)
			) {
				i++;
				candidatePath = normalizePath(`${basePath}_${i}.md`);
			}

			targetPath = candidatePath;

			await plugin.app.vault.create(targetPath, content);
			usedPaths.add(targetPath);

		} else if (plugin.settings.fileNamingBehavior === "override") {
			const existingFile = plugin.app.vault.getAbstractFileByPath(targetPath);

			if (existingFile instanceof TFile && !usedPaths.has(targetPath)) {
				// Case 1: File exists and not used in this batch → override
				await plugin.app.vault.modify(existingFile, content);
				usedPaths.add(targetPath);

			} else if (!existingFile) {
				// Case 2: File does NOT exist → create normally (no suffix)
				await plugin.app.vault.create(targetPath, content);
				usedPaths.add(targetPath);

			} else {
				// Case 3: Duplicate in the same batch → create suffixed file
				let i = 1;
				let candidatePath = normalizePath(`${basePath}_${i}.md`);

				while (
					plugin.app.vault.getAbstractFileByPath(candidatePath) ||
					usedPaths.has(candidatePath)
				) {
					i++;
					candidatePath = normalizePath(`${basePath}_${i}.md`);
				}

				await plugin.app.vault.create(candidatePath, content);
				usedPaths.add(candidatePath);
			}

		}
		new Notice(`Imported ${item.name}`);
	}
}

function parseYamlStatblock(fileContent: string): any {
	// The content passed to this function is already extracted from inside the statblock fence
	// by the export command. So we just need to parse it as YAML.

	try {
		// Parse the YAML content
		const parsed = yaml.load(fileContent);

		if (!parsed || typeof parsed !== "object") {
			console.error("Parsed YAML is not an object:", parsed);
			new Notice("Invalid statblock YAML structure");
			return {};
		}

		// Remove the layout field as it's not part of the adversary data structure
		const parsedObj = parsed as Record<string, any>;
		const { layout, ...adversaryData } = parsedObj;

		// Handle edge cases for browser compatibility
		// Convert empty strings to null where appropriate
		if (adversaryData.id === "") {
			adversaryData.id = null;
		}
		if (adversaryData.imageCredit === "") {
			adversaryData.imageCredit = null;
		}
		if (adversaryData.hordeUnitsPerHp === "") {
			adversaryData.hordeUnitsPerHp = null;
		}

		console.log("Parsed adversary data:", adversaryData);
		return adversaryData;
	} catch (e) {
		console.error("YAML parse failed", e);
		new Notice("Invalid statblock YAML");
		return {};
	}
}


function jsonToYaml(obj: any): string {
	return yaml.dump(obj, {
		indent: 2,
		noRefs: true,        	// no anchors &aliases
		lineWidth: -1,      	// do not fold lines
		quotingType: '"',
		forceQuotes: true,  	// important for statblocks
		sortKeys: false     	// preserve JSON order
	});
}


class FreshCutGrassSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: FreshCutGrassPlugin) { super(app, plugin); }

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Import Folder")
			.addText(t => t.setValue(this.plugin.settings.importFolder).onChange(async v => {
				this.plugin.settings.importFolder = v;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName("Statblock Layout Name")
			.addText(t => t.setValue(this.plugin.settings.statblockLayoutName).onChange(async v => {
				this.plugin.settings.statblockLayoutName = v;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName("File Naming Behavior")
			.addDropdown(t => t
				.addOption("suffix", "Create new with suffix (_1, _2, etc.)")
				.addOption("override", "Override existing file")
				.setValue(this.plugin.settings.fileNamingBehavior)
				.onChange(async v => {
					this.plugin.settings.fileNamingBehavior = v as "override" | "suffix";
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Port to run server on (requires restart)")
			.addText(t => t.setValue(this.plugin.settings.serverPort).onChange(async v => {
				this.plugin.settings.serverPort = v;
				await this.plugin.saveSettings();
			}));
	}
}
