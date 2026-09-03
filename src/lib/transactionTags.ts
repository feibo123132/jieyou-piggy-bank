import { TransactionTag } from '@/types';

export const MAX_TRANSACTION_TAGS = 3;

export const TRANSACTION_TAG_OPTIONS: Array<{
  tag: TransactionTag;
  label: string;
  icon: string;
}> = [
  { tag: 'necessary', label: '自然且必要', icon: '🍚' },
  { tag: 'optional', label: '自然非必要', icon: '🍷' },
  { tag: 'unnatural', label: '不自然且不必要', icon: '👑' },
  { tag: 'unfixed', label: '偶发支出', icon: '💸' },
  { tag: 'idea', label: 'Idea', icon: '💡' },
];

export const TRANSACTION_TAG_META: Record<
  TransactionTag,
  {
    shortLabel: string;
    defaultNote: string;
    toneClassName: string;
  }
> = {
  necessary: {
    shortLabel: '必',
    defaultNote: '自然且必要',
    toneClassName: 'bg-blue-100 text-blue-600',
  },
  fixed: {
    shortLabel: '固',
    defaultNote: '固定支出',
    toneClassName: 'bg-purple-100 text-purple-600',
  },
  unfixed: {
    shortLabel: '偶',
    defaultNote: '偶发支出',
    toneClassName: 'bg-indigo-100 text-indigo-600',
  },
  optional: {
    shortLabel: '非',
    defaultNote: '自然非必要',
    toneClassName: 'bg-orange-100 text-orange-600',
  },
  unnatural: {
    shortLabel: '毒',
    defaultNote: '不自然且不必要',
    toneClassName: 'bg-rose-100 text-rose-600',
  },
  idea: {
    shortLabel: '想',
    defaultNote: 'Idea',
    toneClassName: 'bg-amber-100 text-amber-600',
  },
};

// 互斥组：必要性三档互斥，每次只能选其一
const EXCLUSIVE_GROUPS: TransactionTag[][] = [
  ['necessary', 'optional', 'unnatural'],
];

const getConflictingTags = (tag: TransactionTag): TransactionTag[] => {
  for (const group of EXCLUSIVE_GROUPS) {
    if (group.includes(tag)) {
      return group.filter((member) => member !== tag);
    }
  }
  return [];
};

export const getDefaultTransactionTags = (): TransactionTag[] => ['necessary'];

export const toggleTransactionTag = (
  currentTags: TransactionTag[],
  tag: TransactionTag
): TransactionTag[] => {
  const dedupedTags = Array.from(new Set(currentTags));

  if (dedupedTags.includes(tag)) {
    return dedupedTags.length === 1
      ? dedupedTags
      : dedupedTags.filter((currentTag) => currentTag !== tag);
  }

  const conflictingTags = getConflictingTags(tag);
  const nextTags = dedupedTags.filter(
    (currentTag) => !conflictingTags.includes(currentTag)
  );
  return [...nextTags, tag].slice(-MAX_TRANSACTION_TAGS);
};

export const hasIdeaTag = (tags: TransactionTag[]) => tags.includes('idea');

export const getPrimaryTransactionTag = (tags: TransactionTag[]): TransactionTag => {
  if (tags.includes('fixed')) return 'fixed';
  if (tags.includes('unfixed')) return 'unfixed';
  if (tags.includes('necessary')) return 'necessary';
  if (tags.includes('optional')) return 'optional';
  if (tags.includes('unnatural')) return 'unnatural';
  return 'idea';
};
