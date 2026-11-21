/* ===== Pengaturan ===== */
const NOMOR_PANITIA = "6285183115044"; // ganti nomor WA panitia (format 62...)

/* ===== Pindah tampilan: undangan <-> admin ===== */
function pilihTampilan() {
  const admin = location.hash === "#admin";
  document.getElementById("viewAdmin").classList.toggle("hidden", !admin);
  document.getElementById("viewUndangan").classList.toggle("hidden", admin);
  if (admin) window.scrollTo(0, 0);
}
window.addEventListener("hashchange", pilihTampilan);
pilihTampilan();

/* ===== Personalisasi lewat query parameter ===== */
const params = new URLSearchParams(location.search);
const nama = (params.get("to") || "").trim() || "Tamu Undangan";
const kategori = (params.get("kategori") || "").trim() || "Tamu";

// textContent (bukan innerHTML) agar aman dari injeksi HTML lewat URL
document.getElementById("namaTamu").textContent = nama;
document.getElementById("kategoriTamu").textContent = kategori;
document.getElementById("rsvpNama").value = nama === "Tamu Undangan" ? "" : nama;
if (params.get("to")) document.title = "Undangan untuk " + nama + " | Edu Fair 2026";

/* ===== RSVP -> WhatsApp panitia ===== */
document.getElementById("rsvpForm").addEventListener("submit", e => {
  e.preventDefault();
  const n = document.getElementById("rsvpNama");
  if (!n.value.trim()) { n.focus(); return; }
  const status = document.getElementById("rsvpStatus").value;
  const jumlah = document.getElementById("rsvpJumlah").value;
  const catatan = document.getElementById("rsvpCatatan").value.trim();
  const pesan =
    "Konfirmasi RSVP Edu Fair & Career Day 2026\n" +
    "Nama/Instansi: " + n.value.trim() + "\n" +
    "Kategori: " + kategori + "\n" +
    "Kehadiran: " + status + "\n" +
    (status === "Hadir" ? "Jumlah: " + jumlah + " orang\n" : "") +
    (catatan ? "Catatan: " + catatan : "");
  const ok = document.getElementById("rsvpOk");
  ok.textContent = "Terima kasih! WhatsApp akan terbuka untuk mengirim konfirmasi Anda.";
  ok.classList.remove("hidden");
  window.open("https://wa.me/" + NOMOR_PANITIA + "?text=" + encodeURIComponent(pesan), "_blank");
});

/* ===== ADMIN: baca CSV & blast WhatsApp ===== */
document.getElementById("baseUrl").value = location.href.split(/[?#]/)[0];
document.getElementById("template").value =
"Yth. {nama} ({instansi}),\n\nKami mengundang Anda ke Edu Fair & Career Day 2026 pada Sabtu, 12 Desember 2026, pukul 08.00 WIB di Aula Utama sekolah.\n\nBuka undangan Anda di sini:\n{link}\n\nMohon konfirmasi kehadiran melalui form di halaman tersebut. Terima kasih.";

const tbody = document.getElementById("tbody");
const errBox = document.getElementById("error");

// Parser CSV sederhana (mendukung tanda kutip dan koma di dalam kolom)
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(v => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v.trim() !== "")) rows.push(row);
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

// 0812... / +62812... -> 62812...
function normalisasiNomor(n) {
  let d = n.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return d;
}

function buatLink(g) {
  const u = new URL(document.getElementById("baseUrl").value.trim());
  u.searchParams.set("to", g.nama_tamu);
  u.searchParams.set("kategori", g.kategori);
  return u.href;
}

function kirimWA(g) {
  let link;
  try { link = buatLink(g); }
  catch {
    errBox.textContent = "Alamat halaman undangan tidak valid. Isi dengan alamat lengkap, misalnya https://situs-anda.com/index.html";
    errBox.classList.remove("hidden");
    return;
  }
  errBox.classList.add("hidden");
  const pesan = document.getElementById("template").value
    .replaceAll("{nama}", g.nama_tamu)
    .replaceAll("{instansi}", g.instansi)
    .replaceAll("{kategori}", g.kategori)
    .replaceAll("{link}", link);
  window.open("https://wa.me/" + normalisasiNomor(g.no_whatsapp) + "?text=" + encodeURIComponent(pesan), "_blank");
}

function tampilkan(data) {
  tbody.textContent = "";
  data.forEach(g => {
    const tr = document.createElement("tr");
    ["id", "nama_tamu", "instansi", "kategori", "no_whatsapp"].forEach(k => {
      const td = document.createElement("td"); td.textContent = g[k] || ""; tr.appendChild(td);
    });
    const td = document.createElement("td");
    const b = document.createElement("button");
    b.className = "btn wa small"; b.textContent = "Kirim Undangan WhatsApp";
    b.addEventListener("click", () => kirimWA(g));
    td.appendChild(b); tr.appendChild(td); tbody.appendChild(tr);
  });
  document.getElementById("info").textContent = data.length + " tamu dimuat.";
}

document.getElementById("csvFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  errBox.classList.add("hidden");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = parseCSV(reader.result);
      const wajib = ["id", "nama_tamu", "instansi", "kategori", "no_whatsapp"];
      const hilang = wajib.filter(k => !(k in (data[0] || {})));
      if (!data.length || hilang.length) throw new Error("Kolom tidak lengkap. Kolom yang dibutuhkan: " + wajib.join(", ") + ".");
      tampilkan(data);
    } catch (err) {
      errBox.textContent = err.message; errBox.classList.remove("hidden");
    }
  };
  reader.onerror = () => { errBox.textContent = "File tidak bisa dibaca. Coba pilih ulang."; errBox.classList.remove("hidden"); };
  reader.readAsText(file);
});