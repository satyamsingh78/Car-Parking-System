// script.js — fully working, from scratch
window.addEventListener("DOMContentLoaded", () => {
  // check jsPDF
  if (!window.jspdf) {
    console.warn("jsPDF not found. PDF download will fail.");
  }
  const { jsPDF } = window.jspdf || {};

  const TOTAL_SLOTS = 12;
  const RATE_PER_HOUR = 20;

  // DOM refs
  const parkingLot = document.getElementById("parkingLot");
  const searchBox = document.getElementById("searchBox");
  const openFormBtn = document.getElementById("openFormBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const occupiedEl = document.getElementById("occupied");
  const availableEl = document.getElementById("available");
  document.getElementById("ratePerHour").textContent = RATE_PER_HOUR;
  document.getElementById("total-slots").textContent = TOTAL_SLOTS;

  // form modal elements
  const carFormModal = document.getElementById("carFormModal");
  const carModelInput = document.getElementById("carModel");
  const carNumberInput = document.getElementById("carNumber");
  const ownerNameInput = document.getElementById("ownerName");
  const slotSelect = document.getElementById("slotSelect");
  const parkCarBtn = document.getElementById("parkCarBtn");
  const closeFormBtn = document.getElementById("closeFormBtn");

  // info modal elements
  const infoModal = document.getElementById("infoModal");
  const infoCarModel = document.getElementById("infoCarModel");
  const infoCarNumber = document.getElementById("infoCarNumber");
  const infoOwner = document.getElementById("infoOwner");
  const infoSlot = document.getElementById("infoSlot");
  const infoParkedAt = document.getElementById("infoParkedAt");
  const infoDuration = document.getElementById("infoDuration");
  const infoFee = document.getElementById("infoFee");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const removeCarBtn = document.getElementById("removeCarBtn");
  const closeInfoBtn = document.getElementById("closeInfoBtn");

  // state
  let parkingData = JSON.parse(localStorage.getItem("parkingData") || "[]");
  let currentInfoCar = null;
  const slotTimers = new Map();
  let infoTimer = null;

  // helpers
  const save = () => localStorage.setItem("parkingData", JSON.stringify(parkingData));
  const now = () => Date.now();
  const formatDuration = (ms) => {
    const hrs = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };
  const calcHoursCeil = (ms) => Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));

  // render slots
  function clearSlotTimers() {
    for (const t of slotTimers.values()) clearInterval(t);
    slotTimers.clear();
  }

  function startSlotTimer(slotIndex, parkedAt) {
    stopSlotTimer(slotIndex);
    const el = document.querySelector(`#slot-${slotIndex} .timer`);
    const update = () => {
      if (el) el.textContent = formatDuration(now() - parkedAt);
    };
    update();
    const id = setInterval(update, 60000);
    slotTimers.set(slotIndex, id);
  }
  function stopSlotTimer(slotIndex) {
    const id = slotTimers.get(slotIndex);
    if (id) { clearInterval(id); slotTimers.delete(slotIndex); }
  }

  function renderSlots(filter = "") {
    clearSlotTimers();
    parkingLot.innerHTML = "";

    for (let i = 1; i <= TOTAL_SLOTS; i++) {
      const car = parkingData.find((c) => c.slot === i);
      const slotEl = document.createElement("div");
      slotEl.id = `slot-${i}`;
      slotEl.className = "slot " + (car ? "occupied" : "available");

      if (car) {
        slotEl.innerHTML = `<div>${escapeHtml(car.carModel)}</div><div class="small">${escapeHtml(car.carNumber)}</div><div class="timer">--:--</div>`;
      } else {
        slotEl.innerHTML = `<div class="small">Slot ${i}<br>Available</div>`;
      }

      // filtering
      const term = filter.trim().toLowerCase();
      if (term && car) {
        const hay = `${car.carModel} ${car.carNumber} ${car.ownerName}`.toLowerCase();
        if (!hay.includes(term)) slotEl.style.display = "none";
      }

      slotEl.addEventListener("click", () => {
        if (car) openInfo(car);
        else openForm(i);
      });

      parkingLot.appendChild(slotEl);

      if (car) startSlotTimer(i, car.parkedAt);
    }

    occupiedEl.textContent = parkingData.length;
    availableEl.textContent = TOTAL_SLOTS - parkingData.length;
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  // form modal functions
  function populateSlotOptions(preselect = null) {
    slotSelect.innerHTML = "";
    for (let i = 1; i <= TOTAL_SLOTS; i++) {
      if (!parkingData.some(c => c.slot === i)) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `Slot ${i}`;
        slotSelect.appendChild(opt);
      }
    }
    if (preselect && !parkingData.some(c => c.slot === preselect)) slotSelect.value = preselect;
  }

  function openForm(preselect = null) {
    populateSlotOptions(preselect);
    carFormModal.setAttribute("aria-hidden", "false");
    carFormModal.style.display = "flex";
    carModelInput.focus();
  }
  function closeForm() {
    carFormModal.setAttribute("aria-hidden", "true");
    carFormModal.style.display = "none";
    carModelInput.value = carNumberInput.value = ownerNameInput.value = "";
  }

  parkCarBtn.addEventListener("click", () => {
    const carModel = carModelInput.value.trim();
    const carNumber = carNumberInput.value.trim();
    const ownerName = ownerNameInput.value.trim();
    const slot = parseInt(slotSelect.value, 10);
    if (!carModel || !carNumber || !ownerName || !slot) { alert("Fill all fields"); return; }

    const parkedAt = Date.now();
    parkingData.push({ carModel, carNumber, ownerName, slot, parkedAt });
    save();
    closeForm();
    renderSlots(searchBox.value);
  });

  closeFormBtn.addEventListener("click", closeForm);
  openFormBtn.addEventListener("click", () => openForm(null));
  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Clear all parking data?")) return;
    parkingData = []; save(); renderSlots();
  });

  // info modal functions
  function openInfo(car) {
    currentInfoCar = car;
    infoCarModel.textContent = car.carModel;
    infoCarNumber.textContent = car.carNumber;
    infoOwner.textContent = car.ownerName;
    infoSlot.textContent = car.slot;
    infoParkedAt.textContent = new Date(car.parkedAt).toLocaleString();
    updateInfoLive();
    infoModal.setAttribute("aria-hidden", "false");
    infoModal.style.display = "flex";
  }

  function closeInfo() {
    infoModal.setAttribute("aria-hidden", "true");
    infoModal.style.display = "none";
    currentInfoCar = null;
    if (infoTimer) { clearInterval(infoTimer); infoTimer = null; }
  }

  function updateInfoLive() {
    if (!currentInfoCar) return;
    if (infoTimer) clearInterval(infoTimer);
    function refresh() {
      const diff = now() - currentInfoCar.parkedAt;
      infoDuration.textContent = formatDuration(diff);
      infoFee.textContent = calcHoursCeil(diff) * RATE_PER_HOUR;
    }
    refresh();
    infoTimer = setInterval(refresh, 60000);
  }

  closeInfoBtn.addEventListener("click", closeInfo);

  removeCarBtn.addEventListener("click", () => {
    if (!currentInfoCar) return;
    const diff = now() - currentInfoCar.parkedAt;
    const fee = calcHoursCeil(diff) * RATE_PER_HOUR;
    if (!confirm(`Remove ${currentInfoCar.carNumber}?\nFee: ₹${fee}`)) return;
    parkingData = parkingData.filter(c => c.slot !== currentInfoCar.slot);
    save(); closeInfo(); renderSlots(searchBox.value);
  });

  // PDF download (blob approach)
  downloadPdfBtn.addEventListener("click", () => {
    if (!currentInfoCar) return;
    if (!window.jspdf) { alert("jsPDF not loaded"); return; }
    const { jsPDF } = window.jspdf;
    const car = currentInfoCar;
    const diff = now() - car.parkedAt;
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const fee = calcHoursCeil(diff) * RATE_PER_HOUR;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Car Parking Info", 105, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Car Model: ${car.carModel}`, 20, 40);
    doc.text(`Car Number: ${car.carNumber}`, 20, 50);
    doc.text(`Owner: ${car.ownerName}`, 20, 60);
    doc.text(`Slot: ${car.slot}`, 20, 70);
    doc.text(`Parked At: ${new Date(car.parkedAt).toLocaleString()}`, 20, 80);
    doc.text(`Duration: ${hrs}h ${mins}m`, 20, 90);
    doc.text(`Parking Fees:Rs.${fee}`,20, 100);

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${car.carNumber.replace(/\s+/g, "_")}_parking_info.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  // search
  searchBox.addEventListener("input", (e) => renderSlots(e.target.value));

  // init
  function init() {
    // sanitize
    const seen = new Set();
    parkingData = parkingData.filter(c => c && c.slot && !seen.has(c.slot) ? (seen.add(c.slot), true) : false);
    renderSlots();
  }

  init();
});
