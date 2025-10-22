#!/usr/bin/env node

/**
 * Универсальный импортёр викторин из Excel → JSON
 * 
 * Обрабатывает:
 * - party_quizz.xlsx → app/data/questions.json
 * - quizz_mechanics.xlsx → app/data/mechanics.json
 * - quizzes_slugs.xlsx → app/data/quizzes.ts
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к файлам
const QUIZ_FILES_DIR = 'C:\\Users\\azper\\YandexDisk\\yoplix\\quizzes';
const DATA_DIR = path.join(__dirname, '..', 'app', 'data');

// Маппинг полей для нормализации
const QUESTION_FIELDS_MAP = {
  'Slug': 'Slug',
  'questionID': 'questionID',
  'question': 'question',
  'mechanicsType': 'mechanicsType',
  'answerCost': 'answerCost',
  'answer1': 'answer1',
  'comment': 'comment',
  'category': 'category',
  'wrong1': 'wrong1',
  'wrong2': 'wrong2',
  'wrong3': 'wrong3',
  'pic1': 'pic1',
  'pic2': 'pic2'
};

/**
 * Импортирует вопросы из party_quizz.xlsx
 */
function importQuestions(filePath) {
  console.log(`\n📥 Импорт вопросов из ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Конвертируем в JSON с заголовками
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`   Прочитано строк: ${rawData.length}`);
    
    // Нормализуем данные
    const questions = rawData.map(row => {
      const normalized = {};
      
      // Маппим поля
      for (const [excelField, jsonField] of Object.entries(QUESTION_FIELDS_MAP)) {
        if (row[excelField] !== undefined && row[excelField] !== null && row[excelField] !== '') {
          normalized[jsonField] = row[excelField];
        }
      }
      
      // Приводим типы
      if (normalized.questionID) normalized.questionID = Number(normalized.questionID);
      if (normalized.answerCost) normalized.answerCost = Number(normalized.answerCost);
      
      return normalized;
    });
    
    console.log(`   ✅ Обработано вопросов: ${questions.length}`);
    
    return questions;
  } catch (error) {
    console.error(`❌ Ошибка импорта вопросов:`, error.message);
    return [];
  }
}

/**
 * Импортирует механики из quizz_mechanics.xlsx
 */
function importMechanics(filePath) {
  console.log(`\n📥 Импорт механик из ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`   Прочитано строк: ${rawData.length}`);
    
    // Нормализуем данные
    const mechanics = rawData.map(row => ({
      mechanicsType: row.mechanicsType || row.mechanicstype || '',
      script: row.script || '',
      promptText: row.promptText || row.prompttext || ''
    })).filter(m => m.mechanicsType); // Фильтруем пустые
    
    console.log(`   ✅ Обработано механик: ${mechanics.length}`);
    
    return mechanics;
  } catch (error) {
    console.error(`❌ Ошибка импорта механик:`, error.message);
    return [];
  }
}

/**
 * Импортирует метаданные викторин из quizzes_slugs.xlsx
 */
function importQuizzesSlugs(filePath) {
  console.log(`\n📥 Импорт метаданных викторин из ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл не найден: ${filePath}`);
    return [];
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`   Прочитано строк: ${rawData.length}`);
    
    // Нормализуем данные
    const quizzes = rawData.map((row, index) => ({
      id: row.id || index + 1,
      slug: row.slug || '',
      title: row.title || row.Title || '',
      description: row.description || row.Description || '',
      type: row.type || row.Type || 'general',
      price: Number(row.price || row.Price || 0),
      questions: row.questions ? Number(row.questions) : undefined,
      duration: row.duration ? String(row.duration) : undefined
    })).filter(q => q.slug); // Фильтруем пустые
    
    console.log(`   ✅ Обработано викторин: ${quizzes.length}`);
    
    return quizzes;
  } catch (error) {
    console.error(`❌ Ошибка импорта метаданных викторин:`, error.message);
    return [];
  }
}

/**
 * Сохраняет вопросы в JSON
 */
function saveQuestions(questions) {
  const outputPath = path.join(DATA_DIR, 'questions.json');
  
  console.log(`\n💾 Сохранение вопросов в ${outputPath}...`);
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf8');
    console.log(`   ✅ Сохранено вопросов: ${questions.length}`);
  } catch (error) {
    console.error(`❌ Ошибка сохранения вопросов:`, error.message);
  }
}

/**
 * Сохраняет механики в JSON
 */
function saveMechanics(mechanics) {
  const outputPath = path.join(DATA_DIR, 'mechanics.json');
  
  console.log(`\n💾 Сохранение механик в ${outputPath}...`);
  
  try {
    fs.writeFileSync(outputPath, JSON.stringify(mechanics, null, 2), 'utf8');
    console.log(`   ✅ Сохранено механик: ${mechanics.length}`);
  } catch (error) {
    console.error(`❌ Ошибка сохранения механик:`, error.message);
  }
}

/**
 * Сохраняет метаданные викторин в TypeScript файл
 */
function saveQuizzesSlugs(quizzes) {
  const outputPath = path.join(DATA_DIR, 'quizzes.ts');
  
  console.log(`\n💾 Сохранение метаданных викторин в ${outputPath}...`);
  
  try {
    const content = `export type Quiz = {
  id: number;
  slug: string;
  title: string;
  description: string;
  type: string;
  price: number;
  questions?: number;
  duration?: string;
};

export const quizzes: Quiz[] = ${JSON.stringify(quizzes, null, 2)};

export function getQuizBySlug(slug: string): Quiz | undefined {
  return quizzes.find((q) => q.slug === slug);
}
`;
    
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`   ✅ Сохранено викторин: ${quizzes.length}`);
  } catch (error) {
    console.error(`❌ Ошибка сохранения метаданных викторин:`, error.message);
  }
}

/**
 * Главная функция импорта
 */
function main() {
  console.log('🚀 Универсальный импортёр викторин Yoplix');
  console.log('==========================================\n');
  
  // Импортируем вопросы
  const questionsPath = path.join(QUIZ_FILES_DIR, 'party_quizz.xlsx');
  const questions = importQuestions(questionsPath);
  if (questions.length > 0) {
    saveQuestions(questions);
  }
  
  // Импортируем механики
  const mechanicsPath = path.join(QUIZ_FILES_DIR, 'quizz_mechanics.xlsx');
  const mechanics = importMechanics(mechanicsPath);
  if (mechanics.length > 0) {
    saveMechanics(mechanics);
  }
  
  // Импортируем метаданные викторин
  const slugsPath = path.join(QUIZ_FILES_DIR, 'quizzes_slugs.xlsx');
  const quizzes = importQuizzesSlugs(slugsPath);
  if (quizzes.length > 0) {
    saveQuizzesSlugs(quizzes);
  }
  
  console.log('\n✨ Импорт завершён!');
  console.log('==========================================\n');
}

// Запуск
main();

