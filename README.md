# Arsip Karya Ilmiah — Panduan Pasang di Server (VPS/Linux)

## 1. Siapkan
- Butuh Node.js 18 ke atas. Cek: `node -v`
- Upload folder ini ke server (misal `/var/www/arsip-ilmiah`) lewat scp/FTP, lalu:

```
cd /var/www/arsip-ilmiah
npm install --omit=dev
```

## 2. Coba jalankan
```
ADMIN_PASSWORD='passwordkuat' node server.js
```
Buka `http://IP-SERVER:3000`. Klik tombol **Admin** di bagian bawah halaman, masukkan password.

## 3. Jalankan permanen (pm2)
Edit `ecosystem.config.js`: ganti `ADMIN_PASSWORD` dan `SECRET` (teks acak panjang). Lalu:
```
sudo npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup      # ikuti perintah yang muncul
```

## 4. Domain + HTTPS (nginx)
```
server {
  server_name arsip.namasekolah.sch.id;
  client_max_body_size 60m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Lalu `sudo certbot --nginx -d arsip.namasekolah.sch.id`, isi `HTTPS:'1'` di `ecosystem.config.js`, dan `pm2 restart arsip-ilmiah`.

## 5. Penting
- **Backup:** salin seluruh folder `data/` secara rutin (`db.json` berisi tulisan dan profil, `files/` berisi berkas PDF/Word yang diunggah).
- **Draf:** tulisan berstatus Draf hanya terlihat oleh admin; tamu tidak bisa melihatnya, termasuk lewat API.
- Web harus dipasang di akar domain (misal `arsip.sekolah.sch.id/`), bukan di sub-folder.
- **Ganti password admin:** ubah `ADMIN_PASSWORD`, lalu `pm2 restart arsip-ilmiah`.
- Tamu hanya bisa membaca. Hanya yang login admin yang bisa menambah, mengedit, dan menghapus.
