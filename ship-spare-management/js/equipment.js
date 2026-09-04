import { showToast } from "./notifications.js";
import { createId } from "./utils.js";
import { writeSqlite } from "./sqlite.js";

const STORAGE_KEY = "ssms-equipment";

const EQUIPMENT_STATUSES = [
	"Operational",
	"Degraded",
	"Under Maintenance",
	"Unserviceable",
	"Decommissioned",
];

function getEquipmentStorage() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
	} catch (error) {
		console.error("Equipment storage could not be read", error);
		return [];
	}
}

function saveEquipmentStorage(state, equipment) {
	state.equipment = equipment;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment));

	const equipmentMap = equipment.reduce((result, item) => {
		result[item.equipmentId] = item;
		return result;
	}, {});
	writeSqlite("equipment", equipmentMap).catch((error) => console.error("SQLite equipment save failed", error));
}

function getStatusClass(status) {
	if (status === "Operational") return "ok";
	if (status === "Degraded" || status === "Under Maintenance") return "low";
	return "critical";
}

function getEquipmentSpares(equipment, spares) {
	return spares.filter((spare) => {
		return spare.equipmentName === equipment.equipmentName || spare.equipmentId === equipment.equipmentId;
	});
}

function renderEquipmentRows(rows) {
	if (!rows.length) return "<tr><td colspan='9'>No equipment records found.</td></tr>";

	return rows
		.map(
			(item) => `
				<tr>
					<td>${item.equipmentId || "-"}</td>
					<td>${item.equipmentName || "-"}</td>
					<td>${item.equipmentType || "-"}</td>
					<td>${item.manufacturer || "-"}</td>
					<td>${item.model || "-"}</td>
					<td>${item.serialNumber || "-"}</td>
					<td>${item.location || "-"}</td>
					<td><span class="status ${getStatusClass(item.status)}">${item.status || "Operational"}</span></td>
					<td><button class="btn btn-secondary" type="button" data-action="edit-equipment" data-id="${item.equipmentId}">Edit</button></td>
				</tr>
			`
		)
		.join("");
}

function renderEquipmentWiseRows(equipment, spares) {
	const rows = equipment.flatMap((item) => {
		const associated = getEquipmentSpares(item, spares);
		if (!associated.length) {
			return `<tr><td>${item.equipmentName || "-"}</td><td>-</td><td>-</td><td>-</td><td><span class="status low">NO SPARES LINKED</span></td></tr>`;
		}

		return associated.map((spare) => {
			const available = Number(spare.quantityAvailable || 0);
			const required = Number(spare.minimumStockLevel || 0);
			const status = available <= 0 ? "CRITICAL" : available < required ? "LOW" : "ADEQUATE";
			const statusClass = status === "ADEQUATE" ? "ok" : status === "LOW" ? "low" : "critical";
			return `<tr><td>${item.equipmentName || "-"}</td><td>${spare.spareName || "-"}</td><td>${available}</td><td>${required}</td><td><span class="status ${statusClass}">${status}</span></td></tr>`;
		});
	});

	return rows.length ? rows.join("") : "<tr><td colspan='5'>No equipment or spare records found.</td></tr>";
}

function renderCriticalEquipmentRows(equipment, spares) {
	const rows = equipment
		.map((item) => {
			const associated = getEquipmentSpares(item, spares);
			const criticalSpares = associated.filter((spare) => ["Critical"].includes(spare.natureOfSpares || spare.criticality));
			return { item, criticalSpares };
		})
		.filter(({ item, criticalSpares }) => item.criticality === "Critical" || criticalSpares.length);

	if (!rows.length) return "<tr><td colspan='5'>No critical equipment records found.</td></tr>";

	return rows
		.map(({ item, criticalSpares }) => `<tr><td>${item.equipmentName || "-"}</td><td>${item.equipmentType || "-"}</td><td>${item.location || "-"}</td><td>${criticalSpares.length}</td><td><span class="status ${getStatusClass(item.status)}">${item.status || "Operational"}</span></td></tr>`)
		.join("");
}

function equipmentFormMarkup(equipment = {}) {
	const options = EQUIPMENT_STATUSES.map((status) => `<option ${status === (equipment.status || "Operational") ? "selected" : ""}>${status}</option>`).join("");
	return `
		<form id="equipment-form" class="form-grid">
			<div><label>Equipment ID<input name="equipmentId" type="text" value="${equipment.equipmentId || ""}" readonly placeholder="Auto-generated" /></label></div>
			<div><label>Equipment Name<input name="equipmentName" type="text" value="${equipment.equipmentName || ""}" required /></label></div>
			<div><label>Equipment Type<input name="equipmentType" type="text" value="${equipment.equipmentType || ""}" required /></label></div>
			<div><label>Manufacturer<input name="manufacturer" type="text" value="${equipment.manufacturer || ""}" /></label></div>
			<div><label>Model<input name="model" type="text" value="${equipment.model || ""}" /></label></div>
			<div><label>Serial Number<input name="serialNumber" type="text" value="${equipment.serialNumber || ""}" /></label></div>
			<div><label>Location<input name="location" type="text" value="${equipment.location || ""}" /></label></div>
			<div><label>Department<input name="department" type="text" value="${equipment.department || ""}" /></label></div>
			<div><label>Installation Date<input name="installationDate" type="date" value="${equipment.installationDate || ""}" /></label></div>
			<div><label>Criticality<select name="criticality"><option ${equipment.criticality !== "Critical" ? "selected" : ""}>Non-Critical</option><option ${equipment.criticality === "Critical" ? "selected" : ""}>Critical</option></select></label></div>
			<div><label>Status<select name="status">${options}</select></label></div>
			<div style="grid-column: 1 / -1;"><label>Remarks<textarea name="remarks" rows="3">${equipment.remarks || ""}</textarea></label></div>
			<div style="grid-column: 1 / -1; display: flex; gap: 10px; align-items: center;"><button class="btn btn-primary" type="submit">Save Equipment</button><button class="btn btn-secondary" type="button" id="equipment-reset-btn">Reset</button><span id="equipment-message" class="form-message" aria-live="polite"></span></div>
		</form>
	`;
}

function renderRegister(container, state, editingEquipment = {}) {
	const equipment = state.equipment || [];
	container.innerHTML = `
		<section class="card"><div class="section-title"><h2>Equipment Register</h2><span class="muted">${equipment.length} registered</span></div></section>
		<section class="card" style="margin-top: 14px;">${equipmentFormMarkup(editingEquipment)}</section>
		<section class="card" style="margin-top: 14px;"><div class="section-title"><h3>Equipment Records</h3><input id="equipment-search" type="search" placeholder="Search equipment, model, serial or location" style="max-width: 420px;" /></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Manufacturer</th><th>Model</th><th>Serial</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody id="equipment-table-body">${renderEquipmentRows(equipment)}</tbody></table></div></section>
	`;

	const form = container.querySelector("#equipment-form");
	const message = container.querySelector("#equipment-message");
	const resetForm = () => {
		form?.reset();
		const id = form?.querySelector("[name='equipmentId']");
		if (id) id.value = "";
		if (message) message.textContent = "";
	};

	container.querySelector("#equipment-reset-btn")?.addEventListener("click", resetForm);
	container.querySelector("#equipment-search")?.addEventListener("input", (event) => {
		const query = String(event.target.value || "").toLowerCase().trim();
		const filtered = equipment.filter((item) => [item.equipmentName, item.equipmentType, item.model, item.serialNumber, item.location, item.manufacturer].join(" ").toLowerCase().includes(query));
		container.querySelector("#equipment-table-body").innerHTML = renderEquipmentRows(filtered);
	});

	form?.addEventListener("submit", (event) => {
		event.preventDefault();
		const values = Object.fromEntries(new FormData(form).entries());
		const name = String(values.equipmentName || "").trim();
		const type = String(values.equipmentType || "").trim();
		if (!name || !type) {
			message.textContent = "Equipment name and type are required.";
			message.className = "form-message error";
			return;
		}

		const equipmentId = values.equipmentId || createId("EQ");
		const existingIndex = equipment.findIndex((item) => item.equipmentId === equipmentId);
		const record = { ...values, equipmentId, equipmentName: name, equipmentType: type };
		const nextEquipment = [...equipment];
		if (existingIndex >= 0) nextEquipment[existingIndex] = record;
		else nextEquipment.unshift(record);

		saveEquipmentStorage(state, nextEquipment);
		message.textContent = "Equipment record saved successfully.";
		message.className = "form-message success";
		showToast("Equipment record saved.", "success");
		renderRegister(container, state);
	});

	container.querySelectorAll("[data-action='edit-equipment']").forEach((button) => {
		button.addEventListener("click", () => {
			const selected = equipment.find((item) => item.equipmentId === button.dataset.id);
			if (!selected) return;
			renderRegister(container, state, selected);
		});
	});
}

function renderEquipmentWise(container, state) {
	container.innerHTML = `<section class="card"><div class="section-title"><h2>Equipment-wise Spares</h2><span class="muted">Availability by equipment</span></div><div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Associated Spare</th><th>Available Qty</th><th>Minimum Required</th><th>Status</th></tr></thead><tbody>${renderEquipmentWiseRows(state.equipment || [], state.spares || [])}</tbody></table></div></section>`;
}

function renderCriticalEquipment(container, state) {
	container.innerHTML = `<section class="card"><div class="section-title"><h2>Critical Equipment</h2><span class="muted">Criticality and readiness view</span></div><div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Type</th><th>Location</th><th>Critical Spares</th><th>Status</th></tr></thead><tbody>${renderCriticalEquipmentRows(state.equipment || [], state.spares || [])}</tbody></table></div></section>`;
}

export function renderEquipment(container, state) {
	if (state.route === "equipment-wise-spares") {
		renderEquipmentWise(container, state);
		return;
	}
	if (state.route === "critical-equipment") {
		renderCriticalEquipment(container, state);
		return;
	}
	renderRegister(container, state);
}

export function hydrateEquipment(state) {
	const saved = getEquipmentStorage();
	state.equipment = saved.length ? saved : [
		{ equipmentId: "EQ-0001", equipmentName: "Main Engine", equipmentType: "Propulsion", manufacturer: "Wartsila", model: "8L46F", serialNumber: "ME-88412", location: "Engine Room", department: "Engineering", criticality: "Critical", status: "Operational", remarks: "Primary propulsion engine." },
		{ equipmentId: "EQ-0002", equipmentName: "Compressor", equipmentType: "Air Systems", manufacturer: "Mitsubishi", model: "AC-220", serialNumber: "CP-10923", location: "Workshop", department: "Engineering", criticality: "Non-Critical", status: "Operational", remarks: "Service air compressor." },
		{ equipmentId: "EQ-0003", equipmentName: "Pump Motor", equipmentType: "Mechanical", manufacturer: "ABB", model: "M3BP", serialNumber: "PM-44201", location: "Store Room", department: "Engineering", criticality: "Critical", status: "Under Maintenance", remarks: "Cooling water pump motor." },
	];
}
