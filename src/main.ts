import { Plugin, Notice, Setting, PluginSettingTab, App } from "obsidian";
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
}
const DEFAULT_SETTINGS: FreshCutGrassSettings = {
	importFolder: "Adversaries/FCG",
	statblockLayoutName: "default",
	serverPort: "27123",
};

export default class FreshCutGrassPlugin extends Plugin {
	private server: http.Server | null = null;
	private readonly PORT = 27123;
	settings: FreshCutGrassSettings;

	private pendingCommand: null | {
		type: "create" | "readAll" | "readById" | "updateById" | "deleteById",
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
	const folder = plugin.settings.importFolder;

	if (!plugin.app.vault.getAbstractFileByPath(folder))
		await plugin.app.vault.createFolder(folder).catch(() => { });

	for (const item of data) {
		const nameSafe = item.name.replace(/[\\\/:*?"<>|]/g, "_");
		let filename = `${folder}/${nameSafe}.md`;
		let i = 1;
		while (await plugin.app.vault.adapter.exists(filename))
			filename = `${folder}/${nameSafe}_${i++}.md`;

		const yaml = jsonToYaml(item);
		const content =
			`---
statblock: inline
---

\`\`\`statblock
layout: ${plugin.settings.statblockLayoutName}
${yaml}
\`\`\``;

		await plugin.app.vault.create(filename, content);
		new Notice(`Imported ${item.name}`);
	}
}

function parseYamlStatblock(fileContent: string): any {
	const match = fileContent.match(/```statblock\s*\n([\s\S]*?)```/);

	if (!match || typeof match[1] !== "string") {
		return {};
	}

	try {
		const parsed = yaml.load(match[1]);
		return parsed ?? {};
	} catch (e) {
		console.error("YAML parse failed", e);
		new Notice("Invalid statblock YAML");
		return {};
	}
}


function jsonToYaml(obj: any): string {
	return yaml.dump(obj, {
		indent: 2,
		noRefs: true,        // no anchors &aliases
		lineWidth: -1,      // do not fold lines
		quotingType: '"',
		forceQuotes: true,  // important for statblocks
		sortKeys: false     // preserve JSON order
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
			.setName("Port to run server on (requires restart)")
			.addText(t => t.setValue(this.plugin.settings.serverPort).onChange(async v => {
				this.plugin.settings.serverPort = v;
				await this.plugin.saveSettings();
			}));
	}
}
