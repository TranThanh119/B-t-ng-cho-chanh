/* ============================================================
   FILE NÀY LÀ NƠI DUY NHẤT BẠN CẦN SỬA
   Sửa xong thì lưu lại và mở index.html để xem kết quả.
   ============================================================ */

// 1) TÊN HAI NGƯỜI
const NAME_A = "tớ";           // tên bạn — ví dụ "Thành"
const NAME_B = "Chanh";            // tên bạn gái — ví dụ "Châu Anh"

// 2) LỜI MỞ ĐẦU (hiện theo kiểu gõ chữ, mỗi dòng là 1 câu)
const INTRO_LINES = [
  `Gửi ${NAME_B},`,
  `Có những điều ${NAME_A} không giỏi nói thành lời,`,
  `nên ${NAME_A} làm một trang nhỏ này để gửi tới ${NAME_B}.`,
  `Chạm nhẹ để đi tiếp nhé…`
];

// 3) LÁ THƯ (xuống dòng bằng cách bấm Enter trong dấu backtick `...`)
const LETTER_TEXT =
`${NAME_B} iu dấu,

Hôm nay chẳng phải ngày đặc biệt gì cả nhưng tớ có đôi lời muốn gửi tới ${NAME_B}.
Cố gắng lên hôm nay có là ngày tôi tệ thế nào đi nữa hãy mỉm cười tiếp tục.
Còn nhiều chặng đường phía trước phải đi qua, nhiều khó khăn trước mặt
đừng nản lòng, mọi chuyện rồi cũng sẽ có cách giải quyết thôi.

Hãy đặt sức khỏe của mình lên hàng đầu, đừng bỏ bữa, đừng làm việc quá sức và ngủ đủ giấc nhé.
Tớ biết rằng ở bên đó 1 mình ${NAME_B} sẽ phải chịu nhiều áp lực, nhớ gia đình và bạn bè nhiều lắm
${NAME_B} mạnh mẽ lên giữ vững tinh thần, kiên cường vượt qua tất cả. 

Cảm ơn ${NAME_B} vì đã ở bên tớ 8 năm qua, trải quả nhiều thăng trầm cùng nhau.
Mong rằng trang nhỏ này khiến ${NAME_B} vui lên,
dẫu có sao thì tớ luôn ở đây đồng hành cùng ${NAME_B}, và tớ nhớ cậu nhiều.`;

// 4) MÀN KẾT
const FINALE_TITLE = `Thành & ${NAME_B}`;
const FINALE_TEXT = "cảm ơn vì đã luôn là điều bất ngờ dịu dàng nhất trong cuộc sống của tớ. 心から愛していました";

/* ============================================================
   5) ẢNH CAROUSEL (màn "Những khoảnh khắc")
   - Điền url: "duong-dan-anh.jpg" để dùng ảnh thật
   - Để url: "" thì sẽ hiện khung placeholder
   - Cách dùng ảnh thật: tạo 1 thư mục "photos" cạnh index.html,
     bỏ ảnh vào đó, rồi ghi url: "photos/ten-anh.jpg"
   ============================================================ */
const CAROUSEL_PHOTOS = [
  { url: "photos/1.jpg", caption: "Bức ảnh đầu tiên" },
  { url: "photos/2.jpg", caption: "Waifu " },
  { url: "photos/3.jpg", caption: "Ava" },
  { url: "photos/4.jpg", caption: "Ấm áp" },
  { url: "photos/5.jpg", caption: "Dễ thương" },
  { url: "photos/6.jpg", caption: "Nụ cười" },
  { url: "photos/7.jpg", caption: "Ngày mới" },
  { url: "photos/8.jpg", caption: "Bĩu môi" },
];

// 6) ẢNH "NỔ" HÌNH 3D 
// - Có 3 hình 3D: hydrangea (hoa cẩm tú cầu), heart (trái tim), lemon (quả chanh)
// - Mỗi hình có ĐÚNG 8 ảnh, khi hình nổ mở ra hoàn toàn thì 8 ảnh này mới hiện lên
// - Điền url: "photos/ten-anh.jpg" để dùng ảnh thật
// - Để url: "" thì sẽ hiện khung placeholder (bạn tự thay ảnh sau)
const SHAPE3D_PHOTOS = {
  hydrangea: [
    { url: "photos/9.jpg" }, { url: "photos/10.jpg" }, { url: "photos/11.jpg" }, { url: "photos/12.jpg" },
    { url: "photos/13.jpg" }, { url: "photos/14.jpg" }, { url: "photos/15.jpg" }, { url: "photos/16.jpg" },
  ],
  heart: [
    { url: "photos/17.jpg" }, { url: "photos/18.png" }, { url: "photos/19.jpg" }, { url: "photos/20.jpg" },
    { url: "photos/21.jpg" }, { url: "photos/22.jpg" }, { url: "photos/23.jpg" }, { url: "photos/24.jpg" },
  ],
  lemon: [
    { url: "photos/25.jpg" }, { url: "photos/26.jpg" }, { url: "photos/27.jpg" }, { url: "photos/28.jpg" },
    { url: "photos/29.jpg" }, { url: "photos/30.jpg" }, { url: "photos/31.jpg" }, { url: "photos/32.jpg" },
  ],
};
// 7) NHẠC NỀN — đặt file nhạc vào thư mục "music" cạnh index.html,
// rồi đổi tên file bên dưới cho khớp. Để "" thì sẽ không phát nhạc nền.
const BG_MUSIC_URL = "music/Nguoiyeubolo.mp3";
const BG_MUSIC_VOLUME = 0.35; // 0 -> 1