
# Hướng Dẫn Deploy DANALOG Platform

Chào bạn, đây là hướng dẫn deploy ứng dụng lên server (Ubuntu/Linux).

## 1. Chuẩn Bị Server
Đảm bảo bạn có quyền SSH vào server và OS là Ubuntu 20.04 hoặc 22.04.

## 2. Upload Code
Upload file zip này lên server vào thư mục `/var/www/danalog-frontend`.
Bạn có thể dùng command này từ máy local (sau khi giải nén):
```bash
scp -r * user@your_server_ip:/var/www/danalog-frontend
```

## 3. Chạy Script Deploy
SSH vào server và chạy:
```bash
cd /var/www/danalog-frontend
chmod +x danalog_deploy.sh
./danalog_deploy.sh
```

## 4. Kiểm Tra User
File `db.json` chứa dữ liệu user. Nếu bạn deploy lần đầu, file này sẽ có user mặc định:
- Admin: `admin` / `admin123`
- Tài xế: `tiennd` / `driver123`

⚠️ **Lưu ý**: Nếu bạn deploy đè lên phiên bản cũ, hãy copy file `db.json` cũ ra chỗ khác rồi copy lại vào sau khi deploy để tránh mất dữ liệu.

## Các Sự Cố Thường Gặp
- **502 Bad Gateway**: Check xem server nodejs có chạy không bằng lệnh `pm2 status`.
- **Lỗi Permission**: Đảm bảo folder có quyền ghi (`chmod 777 db.json` nếu cần nhanh, hoặc chown đúng user).

Chúc bạn thành công!
