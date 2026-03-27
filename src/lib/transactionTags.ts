import { TransactionTag } from '@/types';

export const MAX_TRANSACTION_TAGS = 3;

export const TRANSACTION_TAG_OPTIONS: Array<{
  tag: TransactionTag;
  label: string;
  icon: string;
}> = [
  { tag: 'necessary', label: '必要支出', icon: '🍰' },
  { tag: 'fixed', label: '固定支出', icon: '⚡' },
  { tag: 'optional', label: '非必要支出', icon: '🍔' },
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
    defaultNote: '必要支出',
    toneClassName: 'bg-blue-100 text-blue-600',
  },
  fixed: {
    shortLabel: '固',
    defaultNote: '固定支出',
    toneClassName: 'bg-purple-100 text-purple-600',
  },
  optional: {
    shortLabel: '非',
    defaultNote: '日常消费',
    toneClassName: 'bg-orange-100 text-orange-600',
  },
  idea: {
    shortLabel: '想',
    defaultNote: 'Idea',
    toneClassName: 'bg-amber-100 text-amber-600',
  },
};

const EXCLUSIVE_TAGS = new Map<TransactionTag, TransactionTag>([
  ['necessary', 'optional'],
  ['optional', 'necessary'],
]);

export const getDefaultTransactionTags = (): TransactionTag[] => ['optional'];

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

  const conflictingTag = EXCLUSIVE_TAGS.get(tag);
  const nextTags = dedupedTags.filter((currentTag) => currentTag !== conflictingTag);
  return [...nextTags, tag].slice(-MAX_TRANSACTION_TAGS);
};

export const hasIdeaTag = (tags: TransactionTag[]) => tags.includes('idea');

export const getPrimaryTransactionTag = (tags: TransactionTag[]): TransactionTag => {
  if (tags.includes('fixed')) return 'fixed';
  if (tags.includes('necessary')) return 'necessary';
  if (tags.includes('optional')) return 'optional';
  return 'idea';
};
