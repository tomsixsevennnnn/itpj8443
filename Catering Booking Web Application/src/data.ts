import type { Booking, Category, MenuItem, Package } from './types'

/* ------------------------------------------------------------------ *
 * ประเภทอาหาร (9 หมวด) — ใช้เป็นลำดับ "ข้อ" ของเมนูโต๊ะจีน
 * ------------------------------------------------------------------ */
export const CATEGORIES: Category[] = [
  { id: 'snack', label: 'ของทานเล่น', labelEn: 'Snack', icon: '🍤', gradient: 'from-amber-100 to-orange-200' },
  { id: 'appetizer', label: 'ออเดิร์ฟ', labelEn: 'Appetizer', icon: '🥟', gradient: 'from-rose-100 to-pink-200' },
  { id: 'soup', label: 'ซุป / น้ำแกง', labelEn: 'Soup', icon: '🍜', gradient: 'from-orange-100 to-amber-200' },
  { id: 'salad', label: 'ยำ / สลัด', labelEn: 'Salad', icon: '🥗', gradient: 'from-lime-100 to-green-200' },
  { id: 'main', label: 'จานหลักเนื้อสัตว์', labelEn: 'Main Dish', icon: '🍖', gradient: 'from-red-100 to-rose-200' },
  { id: 'fish', label: 'เมนูปลา', labelEn: 'Fish', icon: '🐟', gradient: 'from-sky-100 to-blue-200' },
  { id: 'rice-noodle', label: 'ข้าว / เส้น', labelEn: 'Rice & Noodle', icon: '🍚', gradient: 'from-yellow-100 to-amber-200' },
  { id: 'hotpot', label: 'ต้ม / หม้อไฟ', labelEn: 'Hot Pot / Stew', icon: '🍲', gradient: 'from-orange-100 to-red-200' },
  { id: 'dessert', label: 'ของหวาน', labelEn: 'Dessert', icon: '🍮', gradient: 'from-fuchsia-100 to-purple-200' },
]

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
)

/** สร้างรายการอาหาร 1 จาน */
const dish = (id: string, name: string, category: string, description = ''): MenuItem => ({
  id,
  name,
  category,
  description,
})

/* ------------------------------------------------------------------ *
 * แพ็กเกจโต๊ะจีน — แต่ละแพ็กเกจมี 9 ข้อ เลือกได้ข้อละ 1 อย่าง
 * ------------------------------------------------------------------ */
export const PACKAGES: Package[] = [
  {
    id: 'set-2000',
    name: 'โต๊ะจีน 2,000',
    pricePerTable: 2000,
    menuLimit: 9,
    description: 'อาหาร 9 อย่าง เลือกเมนูเองได้ 7 ข้อ',
    features: ['อาหาร 9 อย่าง / โต๊ะ', 'เลือกเมนูเองได้ 7 ข้อ', 'บริการเสิร์ฟ พร้อมโต๊ะและเก้าอี้'],
    courses: [
      {
        no: 1,
        title: 'ของทานเล่น',
        category: 'snack',
        choose: 0,
        items: [dish('prawn-cracker', 'ข้าวเกรียบทอด', 'snack', 'ข้าวเกรียบกุ้งทอดกรอบ เสิร์ฟก่อนเริ่มงาน')],
      },
      {
        no: 2,
        title: 'ออเดิร์ฟ',
        category: 'appetizer',
        choose: 1,
        items: [
          dish('hot-seafood', 'ทะเลร้อน', 'appetizer', 'ออเดิร์ฟทะเลร้อนรวมมิตร'),
          dish('cold-platter-5', 'จานเย็น 5 อย่าง', 'appetizer', 'หมูแผ่น, ไข่เยี่ยวม้า, ไส้กรอก, โบโลน่าพริก, ขนมจีบ'),
          dish('dimsum-mix', 'ติ่มซำรวม', 'appetizer', 'ติ่มซำนึ่งรวมหลายชนิด'),
        ],
      },
      {
        no: 3,
        title: 'ซุป / น้ำแกง',
        category: 'soup',
        choose: 0,
        items: [dish('fishmaw-shiitake-crab', 'กระเพาะปลาเห็ดหอมเนื้อปู', 'soup', 'กระเพาะปลาน้ำข้น เห็ดหอม เนื้อปูแท้')],
      },
      {
        no: 4,
        title: 'ยำ / สลัด',
        category: 'salad',
        choose: 1,
        items: [
          dish('yum-grilled-pork', 'ยำหมูย่าง', 'salad', 'หมูย่างหั่นชิ้น คลุกน้ำยำรสจัด'),
          dish('yum-sam-krob', 'ยำสามกรอบ', 'salad', 'สามกรอบคลุกน้ำยำ เปรี้ยวหวานกำลังดี'),
          dish('yum-smoked-pork-leg', 'ยำขาหมูรมควัน', 'salad', 'ขาหมูรมควันหอม ๆ ยำรสแซ่บ'),
          dish('pork-lime', 'หมูมะนาว', 'salad', 'หมูลวกราดน้ำจิ้มมะนาวกระเทียมพริก'),
        ],
      },
      {
        no: 5,
        title: 'จานหลักเนื้อสัตว์',
        category: 'main',
        choose: 1,
        items: [
          dish('pork-leg-red-sauce', 'ขาหมูน้ำแดง', 'main', 'ขาหมูตุ๋นน้ำแดงเปื่อยนุ่ม'),
          dish('pork-leg-3-flavor', 'ขาหมูสามรส', 'main', 'ขาหมูทอดกรอบราดซอสสามรส'),
          dish('stuffed-duck-lily', 'เป็ดยัดไส้ดอกไม้จีน', 'main', 'เป็ดยัดไส้ตุ๋นดอกไม้จีน'),
          dish('shrimp-glass-noodle', 'กุ้งอบวุ้นเส้น', 'main', 'กุ้งสดอบหม้อดินกับวุ้นเส้น'),
          dish('four-color-dragon', 'สี่สีมังกรทอด', 'snack', 'ของทอดรวมสี่อย่าง กรอบนอกนุ่มใน'),
        ],
      },
      {
        no: 6,
        title: 'เมนูปลา',
        category: 'fish',
        choose: 1,
        items: [
          dish('tubtim-steamed-lime', 'ปลาทับทิมนึ่งมะนาว', 'fish', 'ปลาทับทิมนึ่งราดน้ำมะนาวพริกสด'),
          dish('tubtim-steamed-plum', 'ปลาทับทิมนึ่งบ๊วย', 'fish', 'ปลาทับทิมนึ่งบ๊วยรสกลมกล่อม'),
          dish('tubtim-fried-3-flavor', 'ปลาทับทิมทอดสามรส', 'fish', 'ปลาทับทิมทอดกรอบราดซอสสามรส'),
        ],
      },
      {
        no: 7,
        title: 'ข้าว / เส้น',
        category: 'rice-noodle',
        choose: 1,
        items: [
          dish('rice-chinese-sausage', 'ข้าวผัดกุนเชียง', 'rice-noodle', 'ข้าวผัดกุนเชียงหอมมัน'),
          dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
          dish('noodle-hongkong-ham', 'หมี่ผัดฮ่องกงแฮม', 'rice-noodle', 'หมี่ฮ่องกงผัดแฮมและผัก'),
          dish('rice-lotus-leaf', 'ข้าวห่อใบบัว', 'rice-noodle', 'ข้าวผัดห่อใบบัวนึ่งหอม'),
        ],
      },
      {
        no: 8,
        title: 'ต้ม / หม้อไฟ',
        category: 'hotpot',
        choose: 1,
        items: [
          dish('shiitake-herbal-stew', 'เห็ดหอมตุ๋นยาจีน', 'hotpot', 'เห็ดหอมตุ๋นเครื่องยาจีน หวานกลมกล่อม'),
          dish('tomyum-seafood', 'ต้มยำรวมมิตรทะเล', 'hotpot', 'ต้มยำทะเลรวม รสจัดจ้าน'),
          dish('tomsaeb-pork-rib', 'ต้มแซ่บซี่โครงอ่อน', 'hotpot', 'ซี่โครงอ่อนต้มแซ่บ เปรี้ยวเผ็ด'),
          dish('kaengsom-snakehead', 'แกงส้มปลาช่อนทอดหม้อไฟ', 'hotpot', 'แกงส้มปลาช่อนทอด เสิร์ฟหม้อไฟ'),
        ],
      },
      {
        no: 9,
        title: 'ของหวาน',
        category: 'dessert',
        choose: 1,
        items: [
          dish('strawberry-loykaew', 'สตรอเบอร์รี่ลอยแก้ว', 'dessert', 'สตรอเบอร์รี่ในน้ำเชื่อมเย็นชื่นใจ'),
          dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
          dish('tofu-milk-fruit-salad', 'เต้าหู้นมสดฟรุตสลัด', 'dessert', 'เต้าหู้นมสดเนื้อนุ่มกับผลไม้รวม'),
          dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
        ],
      },
    ],
  },
  {
    id: 'set-3000',
    name: 'โต๊ะจีน 3,000',
    pricePerTable: 3000,
    menuLimit: 9,
    description: 'อาหาร 9 อย่าง เลือกเมนูเองได้ 8 ข้อ',
    badge: 'แนะนำ',
    features: ['อาหาร 9 อย่าง / โต๊ะ', 'เลือกเมนูเองได้ 8 ข้อ', 'บริการเสิร์ฟ พร้อมตกแต่งโต๊ะ'],
    courses: [
      {
        no: 1,
        title: 'ของทานเล่น',
        category: 'snack',
        choose: 1,
        items: [
          dish('cashew-nut', 'เม็ดมะม่วงหิมพานต์ทอด', 'snack', 'เม็ดมะม่วงหิมพานต์ทอดกรอบเคล้าเกลือ'),
          dish('french-fries', 'เฟรนช์ฟราย', 'snack', 'มันฝรั่งทอดกรอบ เสิร์ฟพร้อมซอส'),
          dish('four-color-dragon', 'สี่สีมังกรทอด', 'snack', 'ของทอดรวมสี่อย่าง กรอบนอกนุ่มใน'),
        ],
      },
      {
        no: 2,
        title: 'ซุป / น้ำแกง',
        category: 'soup',
        choose: 0,
        items: [dish('fishmaw-crab', 'กระเพาะปลาเนื้อปู', 'soup', 'กระเพาะปลาน้ำข้น เนื้อปูก้อนแน่น ๆ')],
      },
      {
        no: 3,
        title: 'ออเดิร์ฟ',
        category: 'appetizer',
        choose: 1,
        items: [
          dish('blanched-seafood', 'ทะเลลวกจิ้ม', 'appetizer', 'อาหารทะเลลวก เสิร์ฟพร้อมน้ำจิ้มซีฟู้ด'),
          dish('appetizer-5', 'ออเดิร์ฟ 5 อย่าง', 'appetizer', 'ออเดิร์ฟรวม 5 ชนิดจัดจาน'),
        ],
      },
      {
        no: 4,
        title: 'จานหลักเนื้อสัตว์',
        category: 'main',
        choose: 1,
        items: [
          dish('roast-duck-red-sauce', 'เป็ดย่างน้ำแดง', 'main', 'เป็ดย่างราดน้ำแดงสูตรจีน'),
          dish('ngow-kuay-taro-basket', 'ผัดโหงวก๊วยตะกร้าเผือก', 'main', 'ผัดโหงวก๊วยเสิร์ฟในตะกร้าเผือกทอด'),
          dish('fruit-salad-fried-shrimp', 'สลัดผลไม้กุ้งทอด', 'main', 'กุ้งทอดคลุกซอสสลัด กับผลไม้รวม'),
        ],
      },
      {
        no: 5,
        title: 'ยำ / สลัด',
        category: 'salad',
        choose: 1,
        items: [
          dish('yum-samkrob-fishmaw-cashew', 'ยำสามกรอบกระเพาะปลาเม็ดมะม่วง', 'salad', 'สามกรอบ กระเพาะปลา และเม็ดมะม่วงหิมพานต์'),
          dish('yum-seafood', 'ยำรวมมิตรทะเล', 'salad', 'อาหารทะเลรวมยำรสจัด'),
          dish('yum-pork-noodle', 'ยำหมูเส้น', 'salad', 'หมูสับกับวุ้นเส้นยำรสแซ่บ'),
        ],
      },
      {
        no: 6,
        title: 'เมนูปลา',
        category: 'fish',
        choose: 1,
        items: [
          dish('snapper-steamed-lime', 'ปลากะพงนึ่งมะนาว', 'fish', 'ปลากะพงนึ่งราดน้ำมะนาวพริกสด'),
          dish('snapper-steamed-plum', 'ปลากะพงนึ่งบ๊วย', 'fish', 'ปลากะพงนึ่งบ๊วยรสกลมกล่อม'),
          dish('snapper-steamed-soy', 'ปลากะพงนึ่งซีอิ๊ว', 'fish', 'ปลากะพงนึ่งซีอิ๊วสไตล์จีน'),
          dish('snapper-fried-3-flavor', 'ปลากะพงทอดสามรส', 'fish', 'ปลากะพงทอดกรอบราดซอสสามรส'),
          dish('snapper-fried-fishsauce', 'ปลากะพงทอดน้ำปลา', 'fish', 'ปลากะพงทอดน้ำปลา หอมกรอบ'),
        ],
      },
      {
        no: 7,
        title: 'ต้ม / หม้อไฟ',
        category: 'hotpot',
        choose: 1,
        items: [
          dish('shiitake-herbal-bamboo', 'เห็ดหอมตุ๋นยาจีนเยื่อไผ่', 'hotpot', 'เห็ดหอมและเยื่อไผ่ตุ๋นเครื่องยาจีน'),
          dish('tomyum-mixed', 'ต้มยำรวมมิตร (น้ำข้น / น้ำใส)', 'hotpot', 'เลือกได้ทั้งน้ำข้นและน้ำใส'),
          dish('clear-soup-bamboo-quail', 'แกงจืดหน่อไม้กระป๋องไข่นกกุ้งสด', 'hotpot', 'แกงจืดหน่อไม้ ไข่นกกระทา และกุ้งสด'),
        ],
      },
      {
        no: 8,
        title: 'ข้าว / เส้น',
        category: 'rice-noodle',
        choose: 1,
        items: [
          dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
          dish('rice-lotus-leaf', 'ข้าวห่อใบบัว', 'rice-noodle', 'ข้าวผัดห่อใบบัวนึ่งหอม'),
          dish('noodle-hongkong-shrimp', 'ผัดหมี่ฮ่องกงกุ้งสด', 'rice-noodle', 'หมี่ฮ่องกงผัดกุ้งสดตัวโต'),
          dish('rice-crab-pork-floss', 'ข้าวผัดปูหมูหย็อง', 'rice-noodle', 'ข้าวผัดปูโรยหมูหย็อง'),
        ],
      },
      {
        no: 9,
        title: 'ของหวาน',
        category: 'dessert',
        choose: 1,
        items: [
          dish('young-coconut-ginkgo', 'มะพร้าวอ่อนแปะก๊วย', 'dessert', 'มะพร้าวอ่อนกับแปะก๊วยเย็น ๆ'),
          dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
          dish('tofu-milk-fruit-salad', 'เต้าหู้นมสดฟรุตสลัด', 'dessert', 'เต้าหู้นมสดเนื้อนุ่มกับผลไม้รวม'),
          dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
          dish('mixed-dessert', 'รวมมิตร', 'dessert', 'รวมมิตรน้ำกะทิ เครื่องหลากหลาย'),
        ],
      },
    ],
  },
  {
    id: 'set-5000',
    name: 'โต๊ะจีน 5,000',
    pricePerTable: 5000,
    menuLimit: 9,
    description: 'อาหาร 9 อย่างระดับพรีเมียม เลือกเมนูเองได้ 8 ข้อ',
    features: ['อาหาร 9 อย่าง / โต๊ะ', 'เลือกเมนูเองได้ 8 ข้อ', 'วัตถุดิบพรีเมียม หูฉลาม เป๋าฮื้อ กุ้งใหญ่'],
    courses: [
      {
        no: 1,
        title: 'ออเดิร์ฟ',
        category: 'appetizer',
        choose: 1,
        items: [
          dish('appetizer-hot', 'ออเดิร์ฟร้อน', 'appetizer', 'ออเดิร์ฟร้อนจัดจานรวม'),
          dish('appetizer-cold', 'ออเดิร์ฟเย็น', 'appetizer', 'ออเดิร์ฟเย็นจัดจานรวม'),
        ],
      },
      {
        no: 2,
        title: 'ซุป / น้ำแกง',
        category: 'soup',
        choose: 0,
        items: [dish('sharkfin-crab', 'หูฉลามเนื้อปูก้อน', 'soup', 'หูฉลามน้ำแดง เนื้อปูก้อนเต็มคำ')],
      },
      {
        no: 3,
        title: 'จานหลัก — เป๋าฮื้อ / หน่อไม้ทะเล',
        category: 'main',
        choose: 1,
        items: [
          dish('abalone-goose-web', 'เป๋าฮื้อทะเลขาห่าน', 'main', 'เป๋าฮื้อกับขาห่านตุ๋นซอสหอย'),
          dish('sea-bamboo-red-sauce', 'หน่อไม้ทะเลน้ำแดง', 'main', 'หน่อไม้ทะเลตุ๋นน้ำแดงเข้มข้น'),
        ],
      },
      {
        no: 4,
        title: 'จานหลัก — เป็ด',
        category: 'main',
        choose: 1,
        items: [
          dish('duck-guitar', 'เป็ดกีต้า', 'main', 'เป็ดอบสไตล์กีต้า เนื้อนุ่มหนังกรอบ'),
          dish('peking-duck', 'เป็ดปักกิ่ง', 'main', 'เป็ดปักกิ่งหนังกรอบ เสิร์ฟพร้อมแป้งห่อ'),
        ],
      },
      {
        no: 5,
        title: 'จานหลัก — กุ้งใหญ่',
        category: 'main',
        choose: 1,
        items: [
          dish('big-shrimp-3-flavor', 'กุ้งใหญ่สามรส', 'main', 'กุ้งใหญ่ทอดราดซอสสามรส'),
          dish('big-shrimp-salad', 'สลัดกุ้งใหญ่', 'main', 'กุ้งใหญ่ทอดคลุกซอสสลัด'),
          dish('big-shrimp-tamarind', 'กุ้งใหญ่ราดซอสมะขาม', 'main', 'กุ้งใหญ่ราดซอสมะขามเปรี้ยวหวาน'),
        ],
      },
      {
        no: 6,
        title: 'เมนูปลา',
        category: 'fish',
        choose: 1,
        items: [
          dish('snowfish-steamed-soy', 'ปลาหิมะนึ่งซีอิ๊ว', 'fish', 'ปลาหิมะเนื้อนุ่มนึ่งซีอิ๊ว'),
          dish('snowfish-steamed-plum', 'ปลาหิมะนึ่งบ๊วย', 'fish', 'ปลาหิมะนึ่งบ๊วยรสกลมกล่อม'),
        ],
      },
      {
        no: 7,
        title: 'ข้าว / เส้น',
        category: 'rice-noodle',
        choose: 1,
        items: [
          dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
          dish('egg-noodle-bbq-pork', 'บะหมี่อบหมูแดง', 'rice-noodle', 'บะหมี่อบหม้อดินกับหมูแดง'),
        ],
      },
      {
        no: 8,
        title: 'ต้ม / หม้อไฟ',
        category: 'hotpot',
        choose: 1,
        items: [
          dish('lousun', 'โหล่วสุ่น', 'hotpot', 'โหล่วสุ่นหม้อไฟรวมเครื่อง'),
          dish('fishhead-hotpot', 'หัวปลาหม้อไฟ', 'hotpot', 'หัวปลาหม้อไฟร้อน ๆ เครื่องแน่น'),
          dish('clear-soup-4-color', 'แกงจืดสี่สี', 'hotpot', 'แกงจืดสี่สี น้ำซุปใสหวานผัก'),
        ],
      },
      {
        no: 9,
        title: 'ของหวาน',
        category: 'dessert',
        choose: 1,
        items: [
          dish('tofu-fresh-milk', 'เต้าหู้นมสด', 'dessert', 'เต้าหู้นมสดเนื้อเนียนนุ่ม'),
          dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
          dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
        ],
      },
    ],
  },
]

/** คลังเมนูทั้งหมด (รวมจากทุกแพ็กเกจ ไม่ซ้ำกัน) เรียงตามลำดับหมวด */
export const MENU_ITEMS: MenuItem[] = (() => {
  const byId = new Map<string, MenuItem>()
  for (const pkg of PACKAGES) {
    for (const course of pkg.courses) {
      for (const item of course.items) {
        if (!byId.has(item.id)) byId.set(item.id, item)
      }
    }
  }
  const order = new Map(CATEGORIES.map((c, i) => [c.id, i]))
  return [...byId.values()].sort(
    (a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99)
  )
})()

/** ข้อที่ลูกค้าต้องเลือกเอง (choose > 0) */
export const requiredCourses = (pkg: Package) => pkg.courses.filter(c => c.choose > 0)

/** ข้อที่รวมมาให้ในแพ็กเกจแล้ว (choose === 0) */
export const includedItems = (pkg: Package) =>
  pkg.courses.filter(c => c.choose === 0).flatMap(c => c.items)

/** วันที่นับจากวันนี้ — ทำให้ข้อมูลตัวอย่างขึ้นบนปฏิทินเสมอ ไม่ว่าจะเปิดใช้เมื่อไร */
const dateFromToday = (offsetDays: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* งานที่จัดไปแล้ว — ใช้ให้กราฟย้อนหลังบนแดชบอร์ดมีข้อมูลจริง */
const SAMPLE_MENUS: Record<number, string[]> = {
  2000: ['ข้าวเกรียบทอด', 'ติ่มซำรวม', 'กระเพาะปลาเห็ดหอมเนื้อปู', 'ขาหมูน้ำแดง', 'ข้าวผัดปู', 'สาคูแคนตาลูป'],
  3000: ['เม็ดมะม่วงหิมพานต์ทอด', 'กระเพาะปลาเนื้อปู', 'ออเดิร์ฟ 5 อย่าง', 'เป็ดย่างน้ำแดง', 'ปลากะพงนึ่งมะนาว', 'มะพร้าวอ่อนแปะก๊วย'],
  5000: ['ออเดิร์ฟร้อน', 'หูฉลามเนื้อปูก้อน', 'เป็ดปักกิ่ง', 'กุ้งใหญ่สามรส', 'ปลาหิมะนึ่งซีอิ๊ว', 'เต้าหู้นมสด'],
}

type HistoryRow = [
  name: string,
  offsetDays: number,
  timeSlot: string,
  tables: number,
  pricePerTable: 2000 | 3000 | 5000,
  location: string,
  phone: string,
  /** true = นอกนครปฐม (คิดค่าขนส่งถ้าไม่ถึง 30 โต๊ะ) */
  metro?: boolean,
]

const HISTORY: HistoryRow[] = [
  ['บริษัท ไทยรุ่งเรือง จำกัด', -205, 'เย็น (17:00-21:00)', 25, 2000, 'สำนักงานใหญ่ ถ.เพชรเกษม อ.สามพราน นครปฐม', '034-311-201'],
  ['อารีย์ พงษ์พานิช', -192, 'กลางวัน (12:00-16:00)', 12, 3000, 'บ้านพัก ต.ลำพยา อ.เมืองนครปฐม นครปฐม', '081-455-2201'],
  ['วัดพระประโทณเจดีย์', -178, 'เช้า (08:00-12:00)', 40, 2000, 'วัดพระประโทณเจดีย์ อ.เมืองนครปฐม นครปฐม', '034-242-118'],
  ['สุรชัย ตั้งใจดี', -165, 'เย็น (17:00-21:00)', 18, 3000, 'หมู่บ้านกฤษดานคร ถ.ปิ่นเกล้า-นครชัยศรี นครปฐม', '089-221-4478'],
  ['โรงเรียนสาธิตนครปฐม', -150, 'กลางวัน (12:00-16:00)', 30, 2000, 'ถ.ราชมรรคาใน อ.เมืองนครปฐม นครปฐม', '034-253-910'],
  ['กนกวรรณ ศรีสุข', -138, 'เย็น (17:00-21:00)', 8, 5000, 'คอนโด ริเวอร์ไซด์ เขตบางพลัด กรุงเทพมหานคร', '086-334-7712', true],
  ['ชูเกียรติ วัฒนกุล', -125, 'ทั้งวัน (07:00 - 21:00)', 60, 3000, 'หอประชุมอำเภอนครชัยศรี นครปฐม', '081-778-3390'],
  ['บริษัท พีเอ็ม โลจิสติกส์', -112, 'เย็น (17:00-21:00)', 22, 3000, 'นิคมอุตสาหกรรมสินสาคร สมุทรสาคร', '034-490-771', true],
  ['ปราณี บุญมาก', -98, 'กลางวัน (12:00-16:00)', 15, 2000, 'บ้านพัก ต.ธรรมศาลา อ.เมืองนครปฐม นครปฐม', '092-118-5560'],
  ['เทศบาลตำบลบางเลน', -85, 'เช้า (08:00-12:00)', 45, 2000, 'ที่ว่าการอำเภอบางเลน นครปฐม', '034-391-045'],
  ['ธีระพงษ์ อินทรีย์', -72, 'เย็น (17:00-21:00)', 20, 5000, 'โรงแรมไมด้า แกรนด์ ทวารวดี นครปฐม', '084-556-9021'],
  ['ศิริพร วงษ์เจริญ', -60, 'ทั้งวัน (07:00 - 21:00)', 35, 3000, 'บ้านพัก ต.ดอนยายหอม อ.เมืองนครปฐม นครปฐม', '098-224-6613'],
  ['บริษัท เอเชียฟู้ด จำกัด', -48, 'กลางวัน (12:00-16:00)', 28, 3000, 'อาคารสำนักงาน ถ.พุทธมณฑลสาย 5 นครปฐม', '02-889-4400'],
  ['มานพ เกียรติศักดิ์', -35, 'เย็น (17:00-21:00)', 10, 5000, 'บ้านพัก เขตตลิ่งชัน กรุงเทพมหานคร', '087-661-2234', true],
  ['สมาคมศิษย์เก่าศิลปากร', -22, 'ทั้งวัน (07:00 - 21:00)', 50, 3000, 'ม.ศิลปากร วิทยาเขตพระราชวังสนามจันทร์ นครปฐม', '034-255-800'],
  ['จิราภรณ์ แสงทอง', -10, 'เย็น (17:00-21:00)', 16, 2000, 'บ้านพัก ต.สนามจันทร์ อ.เมืองนครปฐม นครปฐม', '095-889-3312'],
]

const HISTORY_BOOKINGS: Booking[] = HISTORY.map(
  ([customerName, offsetDays, timeSlot, tables, pricePerTable, location, phone, metro], i) => {
    const deliveryFee = metro && tables < 30 ? 2000 : 0
    return {
      id: `BK-2025-${String(101 + i)}`,
      customerName,
      date: dateFromToday(offsetDays),
      timeSlot,
      tables,
      guestCount: tables * 10,
      packageName: `โต๊ะจีน ${pricePerTable.toLocaleString()}`,
      totalPrice: tables * pricePerTable + deliveryFee,
      pricePerTable,
      deliveryFee,
      status: 'completed',
      location,
      menus: SAMPLE_MENUS[pricePerTable],
      phone,
    }
  }
)

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BK-2025-001',
    customerName: 'สมชาย ใจดี',
    date: dateFromToday(5),
    timeSlot: 'เย็น (17:00-21:00)',
    tables: 5,
    guestCount: 50,
    packageName: 'โต๊ะจีน 3,000',
    totalPrice: 15000,
    status: 'confirmed',
    location: '88/12 หมู่บ้านปัญญา ถ.รามอินทรา แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร (จุดสังเกต: ตรงข้ามปั๊ม ปตท.)',
    locationDetail: {
      lat: 13.8253,
      lng: 100.6612,
      name: 'หมู่บ้านปัญญา รามอินทรา',
      address: 'ถ.รามอินทรา แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร 10230',
      province: 'กรุงเทพมหานคร',
      zone: 'metro',
      detail: {
        houseNo: '88/12',
        building: '',
        village: 'หมู่บ้านปัญญา',
        landmark: 'ตรงข้ามปั๊ม ปตท.',
        accessNote: 'รถบรรทุกเข้าได้ แจ้งชื่อกับ รปภ. หน้าหมู่บ้าน เข้าได้ตั้งแต่ 14:00 น.',
      },
    },
    menus: ['เม็ดมะม่วงหิมพานต์ทอด', 'กระเพาะปลาเนื้อปู', 'ทะเลลวกจิ้ม', 'เป็ดย่างน้ำแดง', 'ยำรวมมิตรทะเล'],
    phone: '081-234-5678',
    staffAuto: { servers: 1, chefs: 1, assistants: 1, dishwashers: 1 },
    staffActual: { servers: 2, chefs: 1, assistants: 1, dishwashers: 1 },
    staffNote: 'งาน VIP ลูกค้าขอพนักงานเสิร์ฟเพิ่ม 1 คน',
    staffSavedAt: '2025-07-20T09:30:00.000Z',
  },
  {
    id: 'BK-2025-002',
    customerName: 'วิภา สุขใส',
    date: dateFromToday(10),
    timeSlot: 'ทั้งวัน (08:00-21:00)',
    tables: 10,
    guestCount: 110,
    packageName: 'โต๊ะจีน 5,000',
    totalPrice: 50000,
    status: 'pending',
    location: '19/9 โรงแรม Novotel Bangkok Sukhumvit 20 ซ.สุขุมวิท 20 เขตคลองเตย กรุงเทพมหานคร',
    locationDetail: {
      lat: 13.7304,
      lng: 100.5657,
      name: 'โรงแรม Novotel Bangkok Sukhumvit 20',
      address: '19/9 ซ.สุขุมวิท 20 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      province: 'กรุงเทพมหานคร',
      zone: 'metro',
      detail: {
        houseNo: '19/9',
        building: 'ห้องบอลรูม ชั้น 3',
        village: '',
        landmark: 'ปากซอยสุขุมวิท 20',
        accessNote: 'ขนของทางลิฟต์บริการหลังอาคาร ต้องแลกบัตรที่ รปภ.',
      },
    },
    menus: ['ออเดิร์ฟร้อน', 'หูฉลามเนื้อปูก้อน', 'เป็ดปักกิ่ง', 'กุ้งใหญ่สามรส', 'ปลาหิมะนึ่งซีอิ๊ว'],
    phone: '089-876-5432',
  },
  {
    id: 'BK-2025-003',
    customerName: 'ประยุทธ์ แก้วใส',
    date: dateFromToday(-14),
    timeSlot: 'เช้า (08:00-12:00)',
    tables: 3,
    guestCount: 25,
    packageName: 'โต๊ะจีน 2,000',
    totalPrice: 6000,
    status: 'completed',
    location: 'บ้านพัก ซอยลาดพร้าว 71 กรุงเทพฯ',
    menus: ['ข้าวเกรียบทอด', 'ติ่มซำรวม', 'กระเพาะปลาเห็ดหอมเนื้อปู', 'ขาหมูน้ำแดง', 'ข้าวผัดปู'],
    phone: '062-111-3344',
  },
  {
    id: 'BK-2025-004',
    customerName: 'นภาพร ดวงจันทร์',
    date: dateFromToday(18),
    timeSlot: 'กลางวัน (12:00-16:00)',
    tables: 7,
    guestCount: 70,
    packageName: 'โต๊ะจีน 3,000',
    totalPrice: 21000,
    status: 'pending',
    location: 'อาคาร SCB Park Plaza ถนนรัชดาภิเษก',
    menus: ['สี่สีมังกรทอด', 'กระเพาะปลาเนื้อปู', 'ปลากะพงนึ่งมะนาว', 'ข้าวผัดปูหมูหย็อง', 'สาคูแคนตาลูป'],
    phone: '095-555-7788',
  },
  {
    id: 'BK-2025-005',
    customerName: 'ชาญชัย มั่นคง',
    date: dateFromToday(25),
    timeSlot: 'เย็น (17:00-21:00)',
    tables: 8,
    guestCount: 80,
    packageName: 'โต๊ะจีน 5,000',
    totalPrice: 40000,
    status: 'confirmed',
    location: 'โรงแรม Centara Grand Central World',
    menus: ['ออเดิร์ฟเย็น', 'เป๋าฮื้อทะเลขาห่าน', 'เป็ดกีต้า', 'หัวปลาหม้อไฟ', 'เต้าหู้นมสด'],
    phone: '086-222-9900',
  },
  {
    id: 'BK-2025-006',
    customerName: 'ธนกร วงศ์ไพศาล',
    date: dateFromToday(12),
    timeSlot: 'ทั้งวัน (07:00 - 21:00)',
    tables: 500,
    guestCount: 5000,
    packageName: 'โต๊ะจีน 3,000',
    totalPrice: 1500000,
    pricePerTable: 3000,
    deliveryFee: 0,
    status: 'confirmed',
    location: 'หอประชุมเทศบาลนครนครปฐม อ.เมืองนครปฐม นครปฐม',
    locationDetail: {
      lat: 13.8199,
      lng: 100.0621,
      name: 'หอประชุมเทศบาลนครนครปฐม',
      address: 'ถ.ราชดำเนิน ต.พระปฐมเจดีย์ อ.เมืองนครปฐม นครปฐม 73000',
      province: 'นครปฐม',
      zone: 'home',
      detail: {
        houseNo: '',
        building: 'หอประชุมใหญ่',
        village: '',
        landmark: 'ติดองค์พระปฐมเจดีย์',
        accessNote: 'งานใหญ่ 500 โต๊ะ เข้าพื้นที่ได้ตั้งแต่ 05:00 น. รถบรรทุกเข้าทางประตูหลัง',
      },
    },
    menus: ['เม็ดมะม่วงหิมพานต์ทอด', 'กระเพาะปลาเนื้อปู', 'ออเดิร์ฟ 5 อย่าง', 'เป็ดย่างน้ำแดง', 'ยำหมูเส้น'],
    phone: '081-999-1234',
  },
  ...HISTORY_BOOKINGS,
]
