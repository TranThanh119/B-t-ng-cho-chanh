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
const FINALE_TITLE = `${NAME_A} & ${NAME_B}`;
const FINALE_TEXT = "cảm ơn vì đã luôn là điều bất ngờ dịu dàng nhất trong cuộc sống của tớ. 心から愛していました";

/* ============================================================
   5) ẢNH CAROUSEL (màn "Những khoảnh khắc")
   - Điền url: "duong-dan-anh.jpg" để dùng ảnh thật
   - Để url: "" thì sẽ hiện khung placeholder
   - Cách dùng ảnh thật: tạo 1 thư mục "photos" cạnh index.html,
     bỏ ảnh vào đó, rồi ghi url: "photos/ten-anh.jpg"
   ============================================================ */
const CAROUSEL_PHOTOS = [
  { url: "photos/Chanh-asuka.jpg", caption: "Bức ảnh tớ ấn tượng" },
  { url: "photos/Ganyuu.jpg", caption: "Waifu " },
  { url: "photos/Chanh.jpg", caption: "Ava" },
  { url: "photos/Mocchau.jpg", caption: "Ấm áp" },
];

// 6) ẢNH ALBUM LƯỚI (màn "Album nhỏ của hai ta")
// - Điền url: "photos/ten-anh.jpg" để dùng ảnh thật
// - Để url: "" thì sẽ hiện khung placeholder
// - Muốn thêm/bớt ô thì thêm/bớt dòng { url: "..." } trong danh sách
const GRID_PHOTOS = [
  { url: "photos/Asukachanh.jpg" },
  { url: "photos/tay.jpg" },
  { url: "photos/Asukachanh2.jpg" },
  { url: "photos/Ngo.jpg" },
  { url: "photos/Cos.jpg" },
  { url: "photos/Cos1.jpg" },
  { url: "photos/Ganyuu.jpg" },
  { url: "photos/Osari.jpg" },
  { url: "photos/Ganyuu2.jpg" },
];
// 7) NHẠC NỀN — đặt file nhạc vào thư mục "music" cạnh index.html,
// rồi đổi tên file bên dưới cho khớp. Để "" thì sẽ không phát nhạc nền.
const BG_MUSIC_URL = "music/Nguoiyeubolo.mp3";
const BG_MUSIC_VOLUME = 0.35; // 0 -> 1