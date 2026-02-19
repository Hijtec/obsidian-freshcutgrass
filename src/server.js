async function createAdversary(payload) {
	try {
		const res = await fetch("https://freshcutgrass.app/api/adversaries", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		let data = null;
		try {
			data = await res.json();
		} catch {
			data = await res.text();
		}

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function updateAdversary(id, payload) {
	const clean = { ...payload };
	delete clean.id; // FCG URL carries the ID

	try {
		const res = await fetch(`https://freshcutgrass.app/api/adversaries/${id}`, {
			method: "PUT",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(clean)
		});

		let data;
		try { data = await res.json(); } catch { data = await res.text(); }

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function getAdversariesMine() {
	try {
		const res = await fetch("https://freshcutgrass.app/api/adversaries/mine", {
			method: "GET",
			credentials: "include",
			headers: {
				"Accept": "application/json"
			}
		});

		let data = null;
		try { data = await res.json(); } catch { data = await res.text(); }

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function getAdversary(id) {
	try {
		const res = await fetch(`https://freshcutgrass.app/api/adversaries/${id}`, {
			method: "GET",
			credentials: "include",
			headers: {
				"Accept": "application/json"
			}
		});

		let data = null;
		try { data = await res.json(); } catch { data = await res.text(); }

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function deleteAdversary(id) {
	try {
		const res = await fetch(`https://freshcutgrass.app/api/adversaries/${id}`, {
			method: "DELETE",
			credentials: "include"
		});

		let data = null;
		try {
			data = await res.json();
		} catch {
			data = await res.text();
		}

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function getPublicAdversaries(idsArray) {
	try {
		const res = await fetch("https://freshcutgrass.app/api/adversaries/public/by-ids", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ ids: idsArray })
		});

		let data = null;
		try { data = await res.json(); } catch { data = await res.text(); }

		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: res.ok,
				status: res.status,
				data // This will be an array of adversary details
			})
		});

	} catch (err) {
		await fetch("http://127.0.0.1:27123/fcg", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				ok: false,
				error: String(err)
			})
		});
	}
}

async function pollObsidian() {
	try {
		const res = await fetch("http://127.0.0.1:27123/fcg/command");
		const cmd = await res.json();

		if (!cmd) return;

		console.log("[FCG Integration] Received command", cmd);

		if (cmd.type === "readAll") {
			await getAdversariesMine();
		}

		if (cmd.type === "readLibrary") {
			await fetchAllAdversariesFromLibrary();
		}

		if (cmd.type === "readById") {
			await getAdversary(cmd.payload.id);
		}

		if (cmd.type === "create") {
			await createAdversary(cmd.payload);
		}

		if (cmd.type === "updateById") {
			await updateAdversary(cmd.payload.id, cmd.payload);
		}

		if (cmd.type === "deleteById") {
			await deleteAdversary(cmd.payload.id);
		}

	} catch (e) {
		// Obsidian not running, ignore
	}
}

setInterval(pollObsidian, 2000);

// Ensure a global object exists
window.FCG = window.FCG || {};

// Attach functions
window.FCG.createAdversary = createAdversary;
window.FCG.getAdversaries = getAdversariesMine;
window.FCG.getAdversary = getAdversary;
window.FCG.updateAdversary = updateAdversary;
window.FCG.deleteAdversary = deleteAdversary;
window.FCG.fetchAllAdversariesFromLibrary = fetchAllAdversariesFromLibrary;

// Log attached functions
console.log("[FCG Integration Frame] Functions attached:", Object.keys(window.FCG));

/**
 * Extracts a JSON-like array string from a large string, given a key.
 * @param {string} str - The large string containing the data.
 * @param {string} key - The key that precedes the array, e.g., 'initialSavedAdversaries":['
 * @returns {string|null} - The array as a string, or null if not found.
 */
function extractArrayString(str, key) {
	const index = str.indexOf(key);
	if (index === -1) {
		console.warn(`Key "${key}" not found in string`);
		return null;
	}

	let start = index + key.length - 1; // start at first '['
	let bracketCount = 0;
	let end = start;

	for (; end < str.length; end++) {
		if (str[end] === '[') bracketCount++;
		else if (str[end] === ']') bracketCount--;

		if (bracketCount === 0) break;
	}

	return str.slice(start, end + 1);
}

/**
 * Extracts a JSON-like array string from a large string, given a key.
 * @param {string} str - The large string containing the data.
 * @param {string} key - The key that precedes the array, e.g., 'initialSavedAdversaries":['
 * @returns {string|null} - The array as a string, or null if not found.
 */
function extractArrayString(str, key) {
	const index = str.indexOf(key);
	if (index === -1) {
		console.warn(`Key "${key}" not found in string`);
		return null;
	}

	let start = index + key.length - 1; // start at first '['
	let bracketCount = 0;
	let end = start;

	for (; end < str.length; end++) {
		if (str[end] === '[') bracketCount++;
		else if (str[end] === ']') bracketCount--;

		if (bracketCount === 0) break;
	}

	return str.slice(start, end + 1);
}

/** -------------------------
 * Utility functions
 * ------------------------- */

/**
 * Fetch the user's library HTML page.
 */
async function fetchLibraryHTML() {
	const res = await fetch("https://freshcutgrass.app/my-content/library", {
		credentials: "include"
	});
	return await res.text();
}

/**
 * Extract __next_f push chunks from the Next.js page HTML.
 */
function extractNextJSPageChunks(html) {
	const regex = /self\.__next_f\.push\((\[[\s\S]*?\])\)/g;
	const chunks = [...html.matchAll(regex)].map(m => m[1]);
	console.log("Chunks found:", chunks.length);
	return chunks;
}

/**
 * Filter chunks that likely contain adversaries data.
 */
function filterLibraryChunksFromNextJSPageChunks(chunks) {
	const libChunks = chunks.filter(c => c.includes("initialSavedAdversaries"));
	console.log("Library chunks found:", libChunks.length);
	return libChunks;
}

/**
 * Extract a JSON-like array string given a key.
 */
function extractArrayString(str, key) {
	const index = str.indexOf(key);
	if (index === -1) return null;

	let start = index + key.length - 1; // start at first '['
	let bracketCount = 0;
	let end = start;

	for (; end < str.length; end++) {
		if (str[end] === '[') bracketCount++;
		else if (str[end] === ']') bracketCount--;

		if (bracketCount === 0) break;
	}

	return str.slice(start, end + 1);
}

/**
 * Parse a JSON array string into a JS array.
 */
function parseArrayString(arrayString) {
	try {
		return JSON.parse(arrayString);
	} catch (err) {
		console.error("Failed to parse array string:", err);
		return null;
	}
}

/**
 * Extract adversaries from a single __next_f chunk.
 */
function extractAdversariesFromChunk(chunk) {
	try {
		const arr = JSON.parse(chunk);
		// Find the element containing "initialSavedAdversaries"
		const embedded = arr.find(el => typeof el === "string" && el.includes("initialSavedAdversaries"));
		if (!embedded) return null;

		const arrayStr = extractArrayString(embedded, 'initialSavedAdversaries":[');
		if (!arrayStr) return null;

		return parseArrayString(arrayStr);
	} catch (e) {
		console.error("Failed to parse chunk:", e);
		return null;
	}
}

/** -------------------------
 * Full workflow: get all adversaries
 * ------------------------- */
async function fetchAllAdversariesFromLibrary() {
	const html = await fetchLibraryHTML();
	console.log("Library HTML length:", html.length);

	const chunks = extractNextJSPageChunks(html);
	const libChunks = filterLibraryChunksFromNextJSPageChunks(chunks);

	const idSet = new Set();

	for (const chunk of libChunks) {
		const advs = extractAdversariesFromChunk(chunk);
		if (!advs) continue;

		for (const adv of advs) {
			if (adv && typeof adv.id === "string") {
				idSet.add(adv.id);
			}
		}
	}

	const ids = [...idSet];

	console.log("=== ALL ADVERSARY IDS ===");
	ids.forEach((id, i) => console.log(`${i + 1}: ${id}`));

	console.log("IDs array:", ids);

	console.log("Fetching adversary details for all IDs...");
	await getPublicAdversaries(ids);
}

