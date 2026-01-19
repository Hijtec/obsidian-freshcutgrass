import { Plugin, Notice, Vault, TFile, WorkspaceLeaf, Setting, PluginSettingTab, App } from "obsidian";
import * as http from "http";

// Add typing for the injected FCG functions the custom frame exposes
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
}
const DEFAULT_SETTINGS: FreshCutGrassSettings = {
	importFolder: "Adversaries/FCG",
	statblockLayoutName: "default",
};

export default class FreshCutGrassPlugin extends Plugin {
	private server: http.Server | null = null;
	private readonly PORT = 27123;
	settings: FreshCutGrassSettings;

	async onload() {
		console.log("[FCG Integration] Plugin loading");

		await this.loadSettings();

		this.addSettingTab(new FreshCutGrassSettingTab(this.app, this));

		// Command to import all adversaries and environments from FCG
		this.addCommand({
			id: "fcg-import-all-adversaries-and-environments",
			name: "Fresh Cut Grass: Import All Adversaries And Environments",
			callback: () => {
				this.pendingCommand = { type: "import" };
				new Notice("FCG: Asking browser for adversaries and environments…");
			}
		});

		// Command to export the currently active note's adversary to FCG
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
				const payload = parseYamlStatblock(content);

				this.pendingCommand = {
					type: "export",
					payload
				};

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

	private pendingCommand: null | {
		type: "import" | "export",
		payload?: any
	} = null;


	private startServer() {
		this.server = http.createServer((req, res) => {
			// ---- CORS HEADERS (ALWAYS) ----
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
			res.setHeader(
				"Access-Control-Allow-Headers",
				"Content-Type"
			);

			// ---- PRE-FLIGHT ----
			if (req.method === "OPTIONS") {
				res.writeHead(204);
				res.end();
				return;
			}

			// ---- ROUTING ----
			if (req.url === "/fcg/command" && req.method === "GET") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(this.pendingCommand));
				this.pendingCommand = null;
				return;
			}

			// ---- FCG DATA ENDPOINT ----
			if (req.url !== "/fcg") {
				res.writeHead(404);
				res.end();
				return;
			}

			if (req.method === "GET") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, status: "alive" }));
				return;
			}

			if (req.method !== "POST") {
				res.writeHead(405);
				res.end();
				return;
			}

			let body = "";
			req.on("data", chunk => (body += chunk));
			req.on("end", () => {
				try {
					const msg = JSON.parse(body);

					console.log("[FCG Integration] API response:", msg);

					if (Array.isArray(msg.data)) {
						new Notice(`FreshCutGrass: received ${msg.data.length} adversaries and environments`);
						handleIncomingData(this, msg.data);
					} else if (msg.ok) {
						new Notice(`FreshCutGrass: created (HTTP ${msg.status})`);
					} else {
						new Notice(`FreshCutGrass failed (HTTP ${msg.status ?? "?"})`);
					}

					// Optional: log full body
					if (msg.data) {
						console.log("[FCG Integration] Response body:", msg.data);
					}

					res.writeHead(200, { "Content-Type": "text/plain" });
					res.end("ok");

				} catch (err) {
					console.error("[FCG Integration] Invalid JSON from frame", err);
					res.writeHead(400);
					res.end("invalid json");
				}
			});

		});

		this.server.listen(this.PORT, "127.0.0.1", () => {
			console.log(`[FCG Integration] Listening on http://127.0.0.1:${this.PORT}`);
		});
	}
}

// When the server receives a POST with `data`, create notes
async function handleIncomingData(plugin: FreshCutGrassPlugin, data: any[]) {
	const folder = plugin.settings.importFolder || "FCG Adversaries";

	// Ensure folder exists
	const folderExists = plugin.app.vault.getAbstractFileByPath(folder);
	if (!folderExists) {
		await plugin.app.vault.createFolder(folder).catch(() => { });
	}

	for (const item of data) {
		const noteName = item.name || "FCG Item";
		const nameSafe = noteName.replace(/[\\\/:*?"<>|]/g, "_");
		let filename = `${folder}/${nameSafe}.md`;
		let index = 1;

		// Prevent overwriting existing files
		while (await plugin.app.vault.adapter.exists(filename)) {
			filename = `${folder}/${nameSafe}_${index}.md`;
			index++;
		}

		const yamlContent = generateYamlStatblockContent(item);
		const frontmatter = `---\nstatblock: inline\n---\n\n`;
		const layoutName = plugin.settings.statblockLayoutName || "default";
		const content = `${frontmatter}\`\`\`statblock\n${layoutName}\n${yamlContent}\n\`\`\``;
		await plugin.app.vault.create(filename, content)
			.catch(err => new Notice(`Error creating note: ${err}`));
		new Notice(`Imported ${item.name}`);
	}
}

// Simple YAML parser for our statblocks (lightweight, just works for our fields)
function parseYamlStatblock(yamlStr?: string): any {
	// Accept undefined and return empty object for safety
	if (!yamlStr) return {};

	const match = content.match(/```statblock[\s\S]*?\n([\s\S]*?)```/);
	const payload = match ? parseYamlStatblock(match[1]) : {};

	const lines = yamlStr.split("\n");
	const obj: any = {};
	let currentKey: string | null = null;

	for (let rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		// List item starting with `- ` belongs to the current key
		if (line.startsWith("- ")) {
			if (!currentKey) continue; // nothing to attach to
			if (!Array.isArray(obj[currentKey])) obj[currentKey] = [];
			obj[currentKey].push(line.slice(2).trim());
			continue;
		}

		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) {
			// line without colon isn't supported; skip
			continue;
		}

		const key = line.slice(0, colonIndex).trim();
		let value = line.slice(colonIndex + 1).trim();

		// Remove optional surrounding quotes
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		}

		// Inline array like: tags: ["a", "b"]
		if (value.startsWith("[") && value.endsWith("]")) {
			const inner = value.slice(1, -1).trim();
			if (!inner) {
				obj[key] = [];
			} else {
				// Simple split on commas and strip quotes
				obj[key] = inner.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
			}
		} else if (value === "") {
			// Key with empty value; prepare for possible `- ` list items or nested keys
			obj[key] = obj[key] || {};
		} else {
			obj[key] = value;
		}

		currentKey = key;
	}

	return obj;
}

// Convert adversary or environment JSON object to YAML string
function generateYamlStatblockContent(item: any): string {
	// const yamlLines: string[] = [];

	// const fields = ["name", "public", "tier", "type", "shortDescription", "toneAndFeel", "publicNotes", "tags", "locations", "motivesAndTactics", "potentialAdversaries", "difficulty", "attackModifier", "hitPoints", "stress", "hordeUnitsPerHp", "weapon", "experience", "features"];

	// fields.forEach(f => {
	// 	const value = item[f];
	// 	if (value == null) return;
	// 	if (Array.isArray(value)) {
	// 		yamlLines.push(`${f}: [${value.map(v => `"${v}"`).join(", ")}]`);
	// 	} else if (typeof value === "object") {
	// 		yamlLines.push(`${f}:`);
	// 		for (const k in value) {
	// 			yamlLines.push(`  ${k}: ${value[k]}`);
	// 		}
	// 	} else {
	// 		yamlLines.push(`${f}: "${value}"`);
	// 	}
	// });

	// return yamlLines.join("\n");
	return jsonToYaml(item);
}

// Generic JSON to YAML parser
function jsonToYaml(obj: any, indent = 0): string {
	const pad = "  ".repeat(indent);

	// Arrays → YAML list
	if (Array.isArray(obj)) {
		return obj
			.map(v => {
				if (typeof v === "object" && v !== null) {
					return `${pad}-\n${jsonToYaml(v, indent + 1)}`;
				} else {
					const safe =
						typeof v === "number" || typeof v === "boolean"
							? v
							: `"${String(v).replace(/"/g, '\\"')}"`;

					return `${pad}- ${safe}`;
				}
			})
			.join("\n");
	}

	// Objects → nested keys
	if (typeof obj === "object" && obj !== null) {
		return Object.entries(obj)
			.map(([k, v]) => {
				if (typeof v === "object" && v !== null) {
					return `${pad}${k}:\n${jsonToYaml(v, indent + 1)}`;
				} else {
					const safe =
						typeof v === "number" || typeof v === "boolean"
							? v
							: `"${String(v).replace(/"/g, '\\"')}"`;

					return `${pad}${k}: ${safe}`;
				}
			})
			.join("\n");
	}

	// Fallback scalar
	return `${pad}${obj}`;
}


class FreshCutGrassSettingTab extends PluginSettingTab {
	plugin: FreshCutGrassPlugin;

	constructor(app: App, plugin: FreshCutGrassPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Fresh Cut Grass Settings" });

		new Setting(containerEl)
			.setName("Import Folder")
			.setDesc("Folder in your vault where imported adversaries will be created")
			.addText(text =>
				text
					.setPlaceholder("FCG Adversaries")
					.setValue(this.plugin.settings.importFolder)
					.onChange(async value => {
						this.plugin.settings.importFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Statblock Layout Name")
			.setDesc("Name of the statblock layout to use for imported adversaries")
			.addText(text =>
				text
					.setPlaceholder("FCG Adversaries")
					.setValue(this.plugin.settings.statblockLayoutName)
					.onChange(async value => {
						this.plugin.settings.statblockLayoutName = value.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}

