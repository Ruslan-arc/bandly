// Bandly mashq bazasi: IELTS formatidagi ORIGINAL mashqlar (rasmiy Cambridge testlari emas)
const TFNG = ['True', 'False', 'Not Given'];
window.BANK = {
  reading: [
    {
      title: 'The Return of Handwriting',
      passage: 'For two decades, schools rushed to replace pencils with keyboards. Recently, however, several countries have reversed this trend. Studies suggest that students who take notes by hand tend to understand lectures more deeply, because writing slowly forces them to summarise ideas rather than copy them word for word. Neuroscientists add that forming letters activates areas of the brain linked to reading and memory. Critics argue that handwriting is slower and that many pupils find it tiring. Supporters reply that speed is not the aim of early education. Some schools now teach cursive for thirty minutes a day, while still providing laptops for older students who must produce long essays.',
      questions: [
        { q: 'Schools replaced pencils with keyboards for about twenty years.', options: TFNG, answer: 0, why: '"For two decades" = 20 yil. Matnda bor, True.' },
        { q: 'Typing helps students understand lectures better than handwriting.', options: TFNG, answer: 1, why: 'Matn aksini aytadi: qo\'lda yozish chuqurroq tushunishga yordam beradi. False.' },
        { q: 'Handwriting is cheaper than buying laptops.', options: TFNG, answer: 2, why: 'Narx haqida hech narsa aytilmagan. Not Given.' },
        { q: 'Why does slow writing help understanding?', options: ['It makes students tired', 'Students must summarise ideas', 'Students copy every word', 'Teachers give more time'], answer: 1, why: '"forces them to summarise ideas rather than copy".' },
        { q: 'What do some schools do now?', options: ['Ban laptops completely', 'Teach cursive daily and keep laptops for older students', 'Teach only typing', 'Stop teaching essays'], answer: 1, why: 'Oxirgi gapda ikkalasi ham aytilgan.' }
      ]
    },
    {
      title: 'Bees on the Rooftop',
      passage: 'Cities are often seen as hostile places for wildlife, yet urban beekeeping has grown quickly. Rooftop hives in Paris, London and New York now produce honey with distinctive flavours, shaped by the many different flowers found in parks and gardens. In fact, city bees sometimes survive better than those in the countryside, where large fields of a single crop offer little variety and are often sprayed with chemicals. However, experts warn that too many hives can leave wild pollinators short of food. One study found that in areas with dense hives, wild bees visited fewer flowers. The researchers recommend that cities plant more flowering trees before adding new hives.',
      questions: [
        { q: 'Urban beekeeping has become more common.', options: TFNG, answer: 0, why: '"has grown quickly". True.' },
        { q: 'City honey tastes the same everywhere.', options: TFNG, answer: 1, why: 'Matnda "distinctive flavours" deyilgan, ya\'ni har xil. False.' },
        { q: 'Beekeepers in cities earn more money than rural beekeepers.', options: TFNG, answer: 2, why: 'Daromad haqida gap yo\'q. Not Given.' },
        { q: 'Why may countryside bees do worse?', options: ['Fields offer little variety and are sprayed', 'There are too many flowers', 'Cities are warmer', 'Hives are too large'], answer: 0, why: '"large fields of a single crop... sprayed with chemicals".' },
        { q: 'What do researchers recommend?', options: ['Remove all hives', 'Plant more flowering trees before adding hives', 'Import wild bees', 'Stop making honey'], answer: 1, why: 'Oxirgi gap.' }
      ]
    }
  ],
  listening: [
    {
      title: 'Library Orientation Talk',
      passage: 'Good morning, everyone, and welcome to the university library. My name is Helen, and I will be showing you around today. First, the opening hours. During term time, the library is open from eight in the morning until ten at night, Monday to Friday. At weekends it opens at nine and closes at five. The quiet study area is on the second floor, and group work is only allowed on the ground floor, near the cafe. To borrow books, you need your student card. Undergraduates can borrow up to ten books for three weeks, while postgraduates can borrow fifteen books for a month. If you return a book late, the fine is fifty pence per day. Finally, printing is available on the first floor, and each student receives twenty free pages every week.',
      questions: [
        { q: 'What time does the library close on weekdays?', options: ['5 pm', '8 pm', '10 pm', '9 pm'], answer: 2, why: '"until ten at night" = 22:00.' },
        { q: 'Where can students work in groups?', options: ['Second floor', 'Ground floor', 'First floor', 'In the cafe only'], answer: 1, why: '"group work is only allowed on the ground floor".' },
        { q: 'How many books can an undergraduate borrow?', options: ['Five', 'Ten', 'Fifteen', 'Twenty'], answer: 1, why: '"Undergraduates can borrow up to ten books".' },
        { q: 'What is the fine for a late book?', options: ['10 pence a day', '15 pence a day', '50 pence a day', '5 pounds a week'], answer: 2, why: '"fifty pence per day".' },
        { q: 'How many free printing pages does each student get weekly?', options: ['10', '20', '30', '50'], answer: 1, why: '"twenty free pages every week".' }
      ]
    }
  ]
};
