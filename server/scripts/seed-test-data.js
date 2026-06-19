/**
 * 测试数据生成脚本
 * 生成2025年1月到2026年6月17日的真实测试数据
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'ledger.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT,
    color TEXT,
    is_preset INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL,
    category_id INTEGER NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
    start_date TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
`);

// 插入分类
const expenseCategories = [
  { name: '餐饮', icon: '🍽️', color: '#FF6B6B' },
  { name: '交通', icon: '🚗', color: '#4ECDC4' },
  { name: '购物', icon: '🛒', color: '#45B7D1' },
  { name: '娱乐', icon: '🎮', color: '#96CEB4' },
  { name: '居住', icon: '🏠', color: '#FFEAA7' },
  { name: '医疗', icon: '💊', color: '#DDA0DD' },
  { name: '教育', icon: '📚', color: '#98D8C8' },
  { name: '通讯', icon: '📱', color: '#F7DC6F' },
  { name: '其他', icon: '📦', color: '#BDC3C7' },
];

const incomeCategories = [
  { name: '工资', icon: '💰', color: '#2ECC71' },
  { name: '奖金', icon: '🎁', color: '#27AE60' },
  { name: '投资', icon: '📈', color: '#16A085' },
  { name: '兼职', icon: '💼', color: '#1ABC9C' },
  { name: '其他', icon: '📦', color: '#95A5A6' },
];

const insertCategory = db.prepare(
  'INSERT INTO categories (name, type, icon, color, is_preset, sort_order) VALUES (?, ?, ?, ?, 1, ?)'
);

expenseCategories.forEach((cat, index) => {
  insertCategory.run(cat.name, 'expense', cat.icon, cat.color, index);
});

incomeCategories.forEach((cat, index) => {
  insertCategory.run(cat.name, 'income', cat.icon, cat.color, index);
});

// 插入标签
const tags = ['工作日', '周末', '节假日', '必需品', '奢侈品', '社交', '个人', '家庭', '紧急', '计划内'];
const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
tags.forEach(tag => insertTag.run(tag));

// 获取分类和标签ID
const getCategory = db.prepare('SELECT id FROM categories WHERE name = ? AND type = ?');
const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
const insertTransaction = db.prepare(
  'INSERT INTO transactions (type, amount, category_id, note, date) VALUES (?, ?, ?, ?, ?)'
);
const insertTransactionTag = db.prepare(
  'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)'
);

// 辅助函数
function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 生成支出数据
const expenseTemplates = [
  // 餐饮
  { category: '餐饮', notes: ['午餐-公司食堂', '晚餐-在家', '早餐-便利店', '午餐-外卖', '晚餐-聚餐', '下午茶-咖啡', '宵夜-烧烤', '午餐-便当', '晚餐-火锅', '早餐-豆浆油条'], minAmount: 15, maxAmount: 150, tags: ['工作日', '必需品'] },
  { category: '餐饮', notes: ['周末brunch', '朋友聚餐', '家庭聚餐', '约会晚餐'], minAmount: 100, maxAmount: 500, tags: ['周末', '社交'] },
  
  // 交通
  { category: '交通', notes: ['地铁通勤', '公交', '打车', '加油', '停车费', '高铁票', '机票'], minAmount: 3, maxAmount: 2000, tags: ['工作日', '必需品'] },
  { category: '交通', notes: ['周末出行', '旅游打车', '租车'], minAmount: 50, maxAmount: 500, tags: ['周末'] },
  
  // 购物
  { category: '购物', notes: ['日用品', '衣服', '鞋子', '数码配件', '家居用品', '护肤品', '食品杂货'], minAmount: 20, maxAmount: 2000, tags: ['必需品'] },
  { category: '购物', notes: ['电子产品', '奢侈品', '礼物'], minAmount: 500, maxAmount: 10000, tags: ['奢侈品'] },
  
  // 娱乐
  { category: '娱乐', notes: ['电影票', '游戏充值', '视频会员', 'KTV', '健身房', '演出门票', '书籍'], minAmount: 10, maxAmount: 500, tags: ['个人', '周末'] },
  
  // 居住
  { category: '居住', notes: ['房租', '水电费', '物业费', '网费', '维修费', '家具家电'], minAmount: 50, maxAmount: 5000, tags: ['必需品', '家庭'] },
  
  // 医疗
  { category: '医疗', notes: ['门诊费', '药品', '体检', '牙科', '眼镜'], minAmount: 20, maxAmount: 3000, tags: ['必需品', '紧急'] },
  
  // 教育
  { category: '教育', notes: ['课程费用', '书籍', '培训', '考试费'], minAmount: 50, maxAmount: 5000, tags: ['个人', '计划内'] },
  
  // 通讯
  { category: '通讯', notes: ['手机话费', '流量包', '宽带'], minAmount: 30, maxAmount: 200, tags: ['必需品'] },
];

// 生成收入数据
const incomeTemplates = [
  { category: '工资', notes: ['月薪', '工资'], minAmount: 8000, maxAmount: 15000, tags: ['工作日'] },
  { category: '奖金', notes: ['季度奖金', '年终奖', '项目奖金', '绩效奖金'], minAmount: 2000, maxAmount: 20000, tags: ['工作日'] },
  { category: '投资', notes: ['股票收益', '基金分红', '理财收益', '利息'], minAmount: 100, maxAmount: 5000, tags: ['计划内'] },
  { category: '兼职', notes: ['兼职收入', '自由职业', '咨询费'], minAmount: 500, maxAmount: 5000, tags: ['个人'] },
  { category: '其他', notes: ['红包', '退款', '二手出售', '中奖'], minAmount: 10, maxAmount: 1000, tags: [] },
];

console.log('开始生成测试数据...\n');

// 生成2025年1月到2026年6月的数据
const startDate = new Date('2025-01-01');
const endDate = new Date('2026-06-17');

let transactionCount = 0;

// 按月生成数据
for (let year = 2025; year <= 2026; year++) {
  const maxMonth = year === 2026 ? 6 : 12;
  
  for (let month = 1; month <= maxMonth; month++) {
    // 生成工资（每月固定）
    const salaryDate = `${year}-${String(month).padStart(2, '0')}-10`;
    const salaryAmount = randomAmount(12000, 18000);
    const salaryCategory = getCategory.get('工资', 'income');
    if (salaryCategory) {
      const result = insertTransaction.run('income', salaryAmount, salaryCategory.id, '月薪', salaryDate);
      transactionCount++;
    }
    
    // 每季度生成奖金
    if (month % 3 === 0) {
      const bonusDate = `${year}-${String(month).padStart(2, '0')}-15`;
      const bonusAmount = randomAmount(3000, 8000);
      const bonusCategory = getCategory.get('奖金', 'income');
      if (bonusCategory) {
        insertTransaction.run('income', bonusAmount, bonusCategory.id, '季度奖金', bonusDate);
        transactionCount++;
      }
    }
    
    // 每月生成投资收益
    const investDate = `${year}-${String(month).padStart(2, '0')}-25`;
    const investAmount = randomAmount(500, 3000);
    const investCategory = getCategory.get('投资', 'income');
    if (investCategory) {
      insertTransaction.run('income', investAmount, investCategory.id, '理财收益', investDate);
      transactionCount++;
    }
    
    // 生成房租（每月固定）
    const rentDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const rentAmount = randomAmount(2000, 3000);
    const rentCategory = getCategory.get('居住', 'expense');
    if (rentCategory) {
      insertTransaction.run('expense', rentAmount, rentCategory.id, '房租', rentDate);
      transactionCount++;
    }
    
    // 生成水电费
    const utilityDate = `${year}-${String(month).padStart(2, '0')}-15`;
    const utilityAmount = randomAmount(100, 250);
    if (rentCategory) {
      insertTransaction.run('expense', utilityAmount, rentCategory.id, '水电费', utilityDate);
      transactionCount++;
    }
    
    // 生成话费
    const phoneDate = `${year}-${String(month).padStart(2, '0')}-20`;
    const phoneAmount = randomAmount(50, 80);
    const phoneCategory = getCategory.get('通讯', 'expense');
    if (phoneCategory) {
      insertTransaction.run('expense', phoneAmount, phoneCategory.id, '手机话费', phoneDate);
      transactionCount++;
    }
    
    // 每月生成15-25条随机支出
    const expenseCount = Math.floor(Math.random() * 10) + 15;
    for (let i = 0; i < expenseCount; i++) {
      const template = getRandomItem(expenseTemplates);
      const category = getCategory.get(template.category, 'expense');
      if (category) {
        const date = randomDate(
          `${year}-${String(month).padStart(2, '0')}-01`,
          `${year}-${String(month).padStart(2, '0')}-28`
        );
        const amount = randomAmount(template.minAmount, template.maxAmount * 0.6); // 降低支出金额
        const note = getRandomItem(template.notes);
        insertTransaction.run('expense', amount, category.id, note, date);
        transactionCount++;
      }
    }
    
    // 每月生成2-3条其他收入
    const incomeCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < incomeCount; i++) {
      const template = getRandomItem(incomeTemplates.slice(1)); // 排除工资
      const category = getCategory.get(template.category, 'income');
      if (category) {
        const date = randomDate(
          `${year}-${String(month).padStart(2, '0')}-01`,
          `${year}-${String(month).padStart(2, '0')}-28`
        );
        const amount = randomAmount(template.minAmount, template.maxAmount);
        const note = getRandomItem(template.notes);
        insertTransaction.run('income', amount, category.id, note, date);
        transactionCount++;
      }
    }
    
    console.log(`${year}年${month}月 数据生成完成`);
  }
}

console.log(`\n共生成 ${transactionCount} 条交易记录`);

// 生成预算数据
console.log('\n生成预算数据...');
const insertBudget = db.prepare(
  'INSERT INTO budgets (category_id, amount, period, start_date) VALUES (?, ?, ?, ?)'
);

// 为每个支出分类创建月度预算
expenseCategories.forEach((cat) => {
  const category = getCategory.get(cat.name, 'expense');
  if (category) {
    let budgetAmount;
    switch (cat.name) {
      case '餐饮': budgetAmount = 3000; break;
      case '交通': budgetAmount = 500; break;
      case '购物': budgetAmount = 2000; break;
      case '娱乐': budgetAmount = 1000; break;
      case '居住': budgetAmount = 4000; break;
      case '医疗': budgetAmount = 500; break;
      case '教育': budgetAmount = 1000; break;
      case '通讯': budgetAmount = 200; break;
      default: budgetAmount = 500;
    }
    insertBudget.run(category.id, budgetAmount, 'monthly', '2025-01-01');
  }
});

console.log('预算数据生成完成');

// 统计数据
const totalTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
const totalIncome = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'").get();
const totalExpense = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'").get();

console.log('\n========== 数据统计 ==========');
console.log(`总记录数: ${totalTransactions.count}`);
console.log(`总收入: ¥${totalIncome.total.toFixed(2)}`);
console.log(`总支出: ¥${totalExpense.total.toFixed(2)}`);
console.log(`结余: ¥${(totalIncome.total - totalExpense.total).toFixed(2)}`);

db.close();
console.log('\n测试数据生成完成！');
