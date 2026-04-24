# Danh sách

## 1. Khung trang web

Dựng layout trang web với các menu chính:

* 📰 Bảng tin
* 🗺️ Bản đồ
* 📊 Dữ liệu lịch sử
* 👤 Tài khoản

---

## 2. Menu User

### Chức năng

* Danh sách user
* Thêm mới user
* Sửa user
* Xoá user

### Data Model

```
interface User {
  fullname: string
  username: string
  role: 'admin' | 'moniter' | 'viewer'
  ctime: number
  dtime?: number
}
```

---

## 3. Menu Bảng tin

Sử dụng thư viện **react-chartjs-2** để hiển thị dữ liệu:

### Biểu đồ

* 📈 Biểu đồ đường:

  * Mực nước thượng lưu
  * Mực nước hạ lưu
  * 24 giờ gần nhất

* 📊 Biểu đồ cột:

  * Trạm đo mưa 1
  * Trạm đo mưa 2
  * Trạm đo mưa 3

---

## 4. Menu Bản đồ

Sử dụng thư viện **react-leaflet**

### Cấu hình

* Tọa độ trung tâm:

  * `16.307696, 107.637046` (Hồ Tả Trạch)

### Chức năng

* Hiển thị 3–4 marker (icon) đại diện các trạm đo
* Khi click vào marker:

  * Hiển thị tên trạm đo

---

## 5. Trang Login

### Thông tin đăng nhập mặc định

* Username: `admin`
* Password: `123456`
