import assert from 'node:assert/strict';
import test from 'node:test';
import type { VariableIncome } from '../types/index.ts';
import {
  getVariableIncomesForMonth,
  replaceVariableIncomesForMonth,
} from './variableIncomes.ts';

const marchSalary: VariableIncome = {
  id: 'march-salary',
  label: '三月兼职',
  amount: 1200,
  month: '2026-03',
  createdAt: '2026-03-06T08:00:00.000Z',
};

const aprilScholarship: VariableIncome = {
  id: 'april-scholarship',
  label: '四月奖学金',
  amount: 800,
  month: '2026-04',
  createdAt: '2026-04-10T08:00:00.000Z',
};

const aprilGift: VariableIncome = {
  id: 'april-gift',
  label: '四月红包',
  amount: 200,
  month: '2026-04',
  createdAt: '2026-04-12T08:00:00.000Z',
};

test('returns only the incomes for the selected month', () => {
  assert.deepEqual(getVariableIncomesForMonth([marchSalary, aprilScholarship, aprilGift], '2026-04'), [
    aprilScholarship,
    aprilGift,
  ]);
});

test('replaces the selected month without removing other months', () => {
  const updatedAprilIncome: VariableIncome = {
    id: 'april-bonus',
    label: '四月奖金',
    amount: 500,
    month: '2026-04',
    createdAt: '2026-04-22T08:00:00.000Z',
  };

  assert.deepEqual(
    replaceVariableIncomesForMonth([marchSalary, aprilScholarship], '2026-04', [updatedAprilIncome]),
    [marchSalary, updatedAprilIncome],
  );
});

test('clears one month while keeping the other months untouched', () => {
  assert.deepEqual(replaceVariableIncomesForMonth([marchSalary, aprilScholarship], '2026-04', []), [marchSalary]);
});
