import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** จานอาหาร 1 รายการ — ใช้ id เดิมจากแคตตาล็อกเริ่มต้น เพื่อให้เมนูซ้ำกันข้ามแพ็กเกจ dedupe กันเอง */
const dish = (id: string, name: string, category: string, description = '') => ({ id, name, category, description })

interface CourseSeed {
  no: number
  title: string
  category: string
  choose: number
  items: { id: string; name: string; category: string; description: string }[]
}

interface PackageSeed {
  id: string
  name: string
  pricePerTable: number
  menuLimit: number
  description: string
  features: string[]
  badge?: string
  courses: CourseSeed[]
}

/** แคตตาล็อกเริ่มต้นของร้าน — ย้ายมาจาก frontend src/data.ts เดิม ให้เป็นข้อมูลจริงใน DB แทนที่จะ hardcode ใน bundle */
const PACKAGES: PackageSeed[] = [
  {
    id: 'set-2000',
    name: 'โต๊ะจีน 2,000',
    pricePerTable: 2000,
    menuLimit: 9,
    description: 'อาหาร 9 อย่าง เลือกเมนูเองได้ 7 ข้อ',
    features: ['อาหาร 9 อย่าง / โต๊ะ', 'เลือกเมนูเองได้ 7 ข้อ', 'บริการเสิร์ฟ พร้อมโต๊ะและเก้าอี้'],
    courses: [
      { no: 1, title: 'ของทานเล่น', category: 'snack', choose: 0, items: [dish('prawn-cracker', 'ข้าวเกรียบทอด', 'snack', 'ข้าวเกรียบกุ้งทอดกรอบ เสิร์ฟก่อนเริ่มงาน')] },
      { no: 2, title: 'ออเดิร์ฟ', category: 'appetizer', choose: 1, items: [
        dish('hot-seafood', 'ทะเลร้อน', 'appetizer', 'ออเดิร์ฟทะเลร้อนรวมมิตร'),
        dish('cold-platter-5', 'จานเย็น 5 อย่าง', 'appetizer', 'หมูแผ่น, ไข่เยี่ยวม้า, ไส้กรอก, โบโลน่าพริก, ขนมจีบ'),
        dish('dimsum-mix', 'ติ่มซำรวม', 'appetizer', 'ติ่มซำนึ่งรวมหลายชนิด'),
      ] },
      { no: 3, title: 'ซุป / น้ำแกง', category: 'soup', choose: 0, items: [dish('fishmaw-shiitake-crab', 'กระเพาะปลาเห็ดหอมเนื้อปู', 'soup', 'กระเพาะปลาน้ำข้น เห็ดหอม เนื้อปูแท้')] },
      { no: 4, title: 'ยำ / สลัด', category: 'salad', choose: 1, items: [
        dish('yum-grilled-pork', 'ยำหมูย่าง', 'salad', 'หมูย่างหั่นชิ้น คลุกน้ำยำรสจัด'),
        dish('yum-sam-krob', 'ยำสามกรอบ', 'salad', 'สามกรอบคลุกน้ำยำ เปรี้ยวหวานกำลังดี'),
        dish('yum-smoked-pork-leg', 'ยำขาหมูรมควัน', 'salad', 'ขาหมูรมควันหอม ๆ ยำรสแซ่บ'),
        dish('pork-lime', 'หมูมะนาว', 'salad', 'หมูลวกราดน้ำจิ้มมะนาวกระเทียมพริก'),
      ] },
      { no: 5, title: 'จานหลักเนื้อสัตว์', category: 'main', choose: 1, items: [
        dish('pork-leg-red-sauce', 'ขาหมูน้ำแดง', 'main', 'ขาหมูตุ๋นน้ำแดงเปื่อยนุ่ม'),
        dish('pork-leg-3-flavor', 'ขาหมูสามรส', 'main', 'ขาหมูทอดกรอบราดซอสสามรส'),
        dish('stuffed-duck-lily', 'เป็ดยัดไส้ดอกไม้จีน', 'main', 'เป็ดยัดไส้ตุ๋นดอกไม้จีน'),
        dish('shrimp-glass-noodle', 'กุ้งอบวุ้นเส้น', 'main', 'กุ้งสดอบหม้อดินกับวุ้นเส้น'),
        dish('four-color-dragon', 'สี่สีมังกรทอด', 'snack', 'ของทอดรวมสี่อย่าง กรอบนอกนุ่มใน'),
      ] },
      { no: 6, title: 'เมนูปลา', category: 'fish', choose: 1, items: [
        dish('tubtim-steamed-lime', 'ปลาทับทิมนึ่งมะนาว', 'fish', 'ปลาทับทิมนึ่งราดน้ำมะนาวพริกสด'),
        dish('tubtim-steamed-plum', 'ปลาทับทิมนึ่งบ๊วย', 'fish', 'ปลาทับทิมนึ่งบ๊วยรสกลมกล่อม'),
        dish('tubtim-fried-3-flavor', 'ปลาทับทิมทอดสามรส', 'fish', 'ปลาทับทิมทอดกรอบราดซอสสามรส'),
      ] },
      { no: 7, title: 'ข้าว / เส้น', category: 'rice-noodle', choose: 1, items: [
        dish('rice-chinese-sausage', 'ข้าวผัดกุนเชียง', 'rice-noodle', 'ข้าวผัดกุนเชียงหอมมัน'),
        dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
        dish('noodle-hongkong-ham', 'หมี่ผัดฮ่องกงแฮม', 'rice-noodle', 'หมี่ฮ่องกงผัดแฮมและผัก'),
        dish('rice-lotus-leaf', 'ข้าวห่อใบบัว', 'rice-noodle', 'ข้าวผัดห่อใบบัวนึ่งหอม'),
      ] },
      { no: 8, title: 'ต้ม / หม้อไฟ', category: 'hotpot', choose: 1, items: [
        dish('shiitake-herbal-stew', 'เห็ดหอมตุ๋นยาจีน', 'hotpot', 'เห็ดหอมตุ๋นเครื่องยาจีน หวานกลมกล่อม'),
        dish('tomyum-seafood', 'ต้มยำรวมมิตรทะเล', 'hotpot', 'ต้มยำทะเลรวม รสจัดจ้าน'),
        dish('tomsaeb-pork-rib', 'ต้มแซ่บซี่โครงอ่อน', 'hotpot', 'ซี่โครงอ่อนต้มแซ่บ เปรี้ยวเผ็ด'),
        dish('kaengsom-snakehead', 'แกงส้มปลาช่อนทอดหม้อไฟ', 'hotpot', 'แกงส้มปลาช่อนทอด เสิร์ฟหม้อไฟ'),
      ] },
      { no: 9, title: 'ของหวาน', category: 'dessert', choose: 1, items: [
        dish('strawberry-loykaew', 'สตรอเบอร์รี่ลอยแก้ว', 'dessert', 'สตรอเบอร์รี่ในน้ำเชื่อมเย็นชื่นใจ'),
        dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
        dish('tofu-milk-fruit-salad', 'เต้าหู้นมสดฟรุตสลัด', 'dessert', 'เต้าหู้นมสดเนื้อนุ่มกับผลไม้รวม'),
        dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
      ] },
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
      { no: 1, title: 'ของทานเล่น', category: 'snack', choose: 1, items: [
        dish('cashew-nut', 'เม็ดมะม่วงหิมพานต์ทอด', 'snack', 'เม็ดมะม่วงหิมพานต์ทอดกรอบเคล้าเกลือ'),
        dish('french-fries', 'เฟรนช์ฟราย', 'snack', 'มันฝรั่งทอดกรอบ เสิร์ฟพร้อมซอส'),
        dish('four-color-dragon', 'สี่สีมังกรทอด', 'snack', 'ของทอดรวมสี่อย่าง กรอบนอกนุ่มใน'),
      ] },
      { no: 2, title: 'ซุป / น้ำแกง', category: 'soup', choose: 0, items: [dish('fishmaw-crab', 'กระเพาะปลาเนื้อปู', 'soup', 'กระเพาะปลาน้ำข้น เนื้อปูก้อนแน่น ๆ')] },
      { no: 3, title: 'ออเดิร์ฟ', category: 'appetizer', choose: 1, items: [
        dish('blanched-seafood', 'ทะเลลวกจิ้ม', 'appetizer', 'อาหารทะเลลวก เสิร์ฟพร้อมน้ำจิ้มซีฟู้ด'),
        dish('appetizer-5', 'ออเดิร์ฟ 5 อย่าง', 'appetizer', 'ออเดิร์ฟรวม 5 ชนิดจัดจาน'),
      ] },
      { no: 4, title: 'จานหลักเนื้อสัตว์', category: 'main', choose: 1, items: [
        dish('roast-duck-red-sauce', 'เป็ดย่างน้ำแดง', 'main', 'เป็ดย่างราดน้ำแดงสูตรจีน'),
        dish('ngow-kuay-taro-basket', 'ผัดโหงวก๊วยตะกร้าเผือก', 'main', 'ผัดโหงวก๊วยเสิร์ฟในตะกร้าเผือกทอด'),
        dish('fruit-salad-fried-shrimp', 'สลัดผลไม้กุ้งทอด', 'main', 'กุ้งทอดคลุกซอสสลัด กับผลไม้รวม'),
      ] },
      { no: 5, title: 'ยำ / สลัด', category: 'salad', choose: 1, items: [
        dish('yum-samkrob-fishmaw-cashew', 'ยำสามกรอบกระเพาะปลาเม็ดมะม่วง', 'salad', 'สามกรอบ กระเพาะปลา และเม็ดมะม่วงหิมพานต์'),
        dish('yum-seafood', 'ยำรวมมิตรทะเล', 'salad', 'อาหารทะเลรวมยำรสจัด'),
        dish('yum-pork-noodle', 'ยำหมูเส้น', 'salad', 'หมูสับกับวุ้นเส้นยำรสแซ่บ'),
      ] },
      { no: 6, title: 'เมนูปลา', category: 'fish', choose: 1, items: [
        dish('snapper-steamed-lime', 'ปลากะพงนึ่งมะนาว', 'fish', 'ปลากะพงนึ่งราดน้ำมะนาวพริกสด'),
        dish('snapper-steamed-plum', 'ปลากะพงนึ่งบ๊วย', 'fish', 'ปลากะพงนึ่งบ๊วยรสกลมกล่อม'),
        dish('snapper-steamed-soy', 'ปลากะพงนึ่งซีอิ๊ว', 'fish', 'ปลากะพงนึ่งซีอิ๊วสไตล์จีน'),
        dish('snapper-fried-3-flavor', 'ปลากะพงทอดสามรส', 'fish', 'ปลากะพงทอดกรอบราดซอสสามรส'),
        dish('snapper-fried-fishsauce', 'ปลากะพงทอดน้ำปลา', 'fish', 'ปลากะพงทอดน้ำปลา หอมกรอบ'),
      ] },
      { no: 7, title: 'ต้ม / หม้อไฟ', category: 'hotpot', choose: 1, items: [
        dish('shiitake-herbal-bamboo', 'เห็ดหอมตุ๋นยาจีนเยื่อไผ่', 'hotpot', 'เห็ดหอมและเยื่อไผ่ตุ๋นเครื่องยาจีน'),
        dish('tomyum-mixed', 'ต้มยำรวมมิตร (น้ำข้น / น้ำใส)', 'hotpot', 'เลือกได้ทั้งน้ำข้นและน้ำใส'),
        dish('clear-soup-bamboo-quail', 'แกงจืดหน่อไม้กระป๋องไข่นกกุ้งสด', 'hotpot', 'แกงจืดหน่อไม้ ไข่นกกระทา และกุ้งสด'),
      ] },
      { no: 8, title: 'ข้าว / เส้น', category: 'rice-noodle', choose: 1, items: [
        dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
        dish('rice-lotus-leaf', 'ข้าวห่อใบบัว', 'rice-noodle', 'ข้าวผัดห่อใบบัวนึ่งหอม'),
        dish('noodle-hongkong-shrimp', 'ผัดหมี่ฮ่องกงกุ้งสด', 'rice-noodle', 'หมี่ฮ่องกงผัดกุ้งสดตัวโต'),
        dish('rice-crab-pork-floss', 'ข้าวผัดปูหมูหย็อง', 'rice-noodle', 'ข้าวผัดปูโรยหมูหย็อง'),
      ] },
      { no: 9, title: 'ของหวาน', category: 'dessert', choose: 1, items: [
        dish('young-coconut-ginkgo', 'มะพร้าวอ่อนแปะก๊วย', 'dessert', 'มะพร้าวอ่อนกับแปะก๊วยเย็น ๆ'),
        dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
        dish('tofu-milk-fruit-salad', 'เต้าหู้นมสดฟรุตสลัด', 'dessert', 'เต้าหู้นมสดเนื้อนุ่มกับผลไม้รวม'),
        dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
        dish('mixed-dessert', 'รวมมิตร', 'dessert', 'รวมมิตรน้ำกะทิ เครื่องหลากหลาย'),
      ] },
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
      { no: 1, title: 'ออเดิร์ฟ', category: 'appetizer', choose: 1, items: [
        dish('appetizer-hot', 'ออเดิร์ฟร้อน', 'appetizer', 'ออเดิร์ฟร้อนจัดจานรวม'),
        dish('appetizer-cold', 'ออเดิร์ฟเย็น', 'appetizer', 'ออเดิร์ฟเย็นจัดจานรวม'),
      ] },
      { no: 2, title: 'ซุป / น้ำแกง', category: 'soup', choose: 0, items: [dish('sharkfin-crab', 'หูฉลามเนื้อปูก้อน', 'soup', 'หูฉลามน้ำแดง เนื้อปูก้อนเต็มคำ')] },
      { no: 3, title: 'จานหลัก — เป๋าฮื้อ / หน่อไม้ทะเล', category: 'main', choose: 1, items: [
        dish('abalone-goose-web', 'เป๋าฮื้อทะเลขาห่าน', 'main', 'เป๋าฮื้อกับขาห่านตุ๋นซอสหอย'),
        dish('sea-bamboo-red-sauce', 'หน่อไม้ทะเลน้ำแดง', 'main', 'หน่อไม้ทะเลตุ๋นน้ำแดงเข้มข้น'),
      ] },
      { no: 4, title: 'จานหลัก — เป็ด', category: 'main', choose: 1, items: [
        dish('duck-guitar', 'เป็ดกีต้า', 'main', 'เป็ดอบสไตล์กีต้า เนื้อนุ่มหนังกรอบ'),
        dish('peking-duck', 'เป็ดปักกิ่ง', 'main', 'เป็ดปักกิ่งหนังกรอบ เสิร์ฟพร้อมแป้งห่อ'),
      ] },
      { no: 5, title: 'จานหลัก — กุ้งใหญ่', category: 'main', choose: 1, items: [
        dish('big-shrimp-3-flavor', 'กุ้งใหญ่สามรส', 'main', 'กุ้งใหญ่ทอดราดซอสสามรส'),
        dish('big-shrimp-salad', 'สลัดกุ้งใหญ่', 'main', 'กุ้งใหญ่ทอดคลุกซอสสลัด'),
        dish('big-shrimp-tamarind', 'กุ้งใหญ่ราดซอสมะขาม', 'main', 'กุ้งใหญ่ราดซอสมะขามเปรี้ยวหวาน'),
      ] },
      { no: 6, title: 'เมนูปลา', category: 'fish', choose: 1, items: [
        dish('snowfish-steamed-soy', 'ปลาหิมะนึ่งซีอิ๊ว', 'fish', 'ปลาหิมะเนื้อนุ่มนึ่งซีอิ๊ว'),
        dish('snowfish-steamed-plum', 'ปลาหิมะนึ่งบ๊วย', 'fish', 'ปลาหิมะนึ่งบ๊วยรสกลมกล่อม'),
      ] },
      { no: 7, title: 'ข้าว / เส้น', category: 'rice-noodle', choose: 1, items: [
        dish('rice-crab-fried', 'ข้าวผัดปู', 'rice-noodle', 'ข้าวผัดเนื้อปูก้อน ไข่ หอมกระทะ'),
        dish('egg-noodle-bbq-pork', 'บะหมี่อบหมูแดง', 'rice-noodle', 'บะหมี่อบหม้อดินกับหมูแดง'),
      ] },
      { no: 8, title: 'ต้ม / หม้อไฟ', category: 'hotpot', choose: 1, items: [
        dish('lousun', 'โหล่วสุ่น', 'hotpot', 'โหล่วสุ่นหม้อไฟรวมเครื่อง'),
        dish('fishhead-hotpot', 'หัวปลาหม้อไฟ', 'hotpot', 'หัวปลาหม้อไฟร้อน ๆ เครื่องแน่น'),
        dish('clear-soup-4-color', 'แกงจืดสี่สี', 'hotpot', 'แกงจืดสี่สี น้ำซุปใสหวานผัก'),
      ] },
      { no: 9, title: 'ของหวาน', category: 'dessert', choose: 1, items: [
        dish('tofu-fresh-milk', 'เต้าหู้นมสด', 'dessert', 'เต้าหู้นมสดเนื้อเนียนนุ่ม'),
        dish('sago-cantaloupe', 'สาคูแคนตาลูป', 'dessert', 'สาคูกะทิสด แคนตาลูปหวานหอม'),
        dish('taro-sticky-rice-ginkgo', 'ข้าวเหนียวเผือกแปะก๊วย', 'dessert', 'ข้าวเหนียวเผือกร้อน ๆ กับแปะก๊วย'),
      ] },
    ],
  },
]

async function main() {
  const existing = await prisma.package.count()
  if (existing > 0) {
    console.log(`มีแพ็กเกจอยู่แล้ว ${existing} รายการ — ข้าม seed (ลบข้อมูลเดิมก่อนถ้าต้องการ seed ใหม่)`)
    return
  }

  const byId = new Map<string, { id: string; name: string; category: string; description: string }>()
  for (const pkg of PACKAGES) {
    for (const course of pkg.courses) {
      for (const item of course.items) {
        if (!byId.has(item.id)) byId.set(item.id, item)
      }
    }
  }

  for (const item of byId.values()) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    })
  }
  console.log(`สร้างเมนู ${byId.size} รายการ`)

  for (const pkg of PACKAGES) {
    await prisma.package.create({
      data: {
        id: pkg.id,
        name: pkg.name,
        pricePerTable: pkg.pricePerTable,
        menuLimit: pkg.menuLimit,
        description: pkg.description,
        features: pkg.features,
        badge: pkg.badge,
        courses: {
          create: pkg.courses.map((c) => ({
            no: c.no,
            title: c.title,
            category: c.category,
            choose: c.choose,
            items: { connect: c.items.map((i) => ({ id: i.id })) },
          })),
        },
      },
    })
  }
  console.log(`สร้างแพ็กเกจ ${PACKAGES.length} รายการ`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
