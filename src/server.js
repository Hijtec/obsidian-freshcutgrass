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


async function getAdversaries() {
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

async function pollObsidian() {
	try {
		const res = await fetch("http://127.0.0.1:27123/fcg/command");
		const cmd = await res.json();

		if (!cmd) return;

		console.log("[FCG Integration] Received command", cmd);

		if (cmd.type === "readAll") {
			await getAdversaries();
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
window.FCG.getAdversaries = getAdversaries;
window.FCG.getAdversary = getAdversary;
window.FCG.updateAdversary = updateAdversary;
window.FCG.deleteAdversary = deleteAdversary;

// Log attached functions
console.log("[FCG Integration Frame] Functions attached:", Object.keys(window.FCG));
