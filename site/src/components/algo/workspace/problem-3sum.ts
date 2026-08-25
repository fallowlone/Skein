import type { Bi, WorkspaceProblem } from "./types";

// Everything below is authored content specific to this one fully-wired demo
// problem: the statement, worked example, seed code, test suite, and reference
// solutions. Title, difficulty, pattern, target minutes, companies, and the hint
// ladder come from the real drill bank (src/content/drill) instead — see
// buildThreeSum's parameters — so this file only owns what the bank does not.

export const SEED_CODE = `function threeSum(nums) {
  const out = [];
  nums.sort((a, b) => a - b);

  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;

    let left = i + 1;
    let right = nums.length - 1;

    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];

      if (sum === 0) {
        out.push([nums[i], nums[left], nums[right]]);
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }
  return out;
}`;

export const REFERENCE_SOLUTION = `function threeSum(nums) {
  const out = [];
  const a = [...nums].sort((x, y) => x - y);

  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    let left = i + 1, right = a.length - 1;

    while (left < right) {
      const sum = a[i] + a[left] + a[right];
      if (sum === 0) {
        out.push([a[i], a[left], a[right]]);
        while (left < right && a[left] === a[++left]);
        while (left < right && a[right] === a[--right]);
      } else if (sum < 0) left++;
      else right--;
    }
  }
  return out;
}`;

export const STATEMENT: Bi[] = [
  {
    en: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, j != k, and nums[i] + nums[j] + nums[k] == 0.",
    ru: "Дан целочисленный массив nums. Верни все тройки [nums[i], nums[j], nums[k]], такие что i != j, i != k, j != k и nums[i] + nums[j] + nums[k] == 0.",
  },
  {
    en: "The solution set must not contain duplicate triplets. Order within a triplet and order of triplets do not matter.",
    ru: "Набор решений не должен содержать повторяющихся троек. Порядок внутри тройки и порядок самих троек не важны.",
  },
];

export const EXAMPLE = {
  input: "nums = [-1,0,1,2,-1,-4]",
  output: "[[-1,-1,2],[-1,0,1]]",
  why: {
    en: "Sorted, the array is [-4,-1,-1,0,1,2]. Two distinct triplets sum to zero; [-1,0,1] appears twice in raw index space and must be emitted once.",
    ru: "После сортировки массив — [-4,-1,-1,0,1,2]. Две различные тройки дают в сумме ноль; [-1,0,1] встречается дважды в исходных индексах, но должна попасть в ответ один раз.",
  } satisfies Bi,
};

const DUP_DIAGNOSIS: Bi = {
  en: "The fixed index skips duplicates, but left and right do not — after recording a triplet both pointers can land on equal values and record it again.",
  ru: "Фиксированный индекс пропускает дубликаты, а left и right — нет: после записи тройки оба указателя могут снова оказаться на равных значениях и записать её повторно.",
};

export const REFERENCE_BIG_O = "O(n²)";

export function buildThreeSum(params: {
  id: string;
  leetcodeId: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  pattern: string;
  targetMinutes: number;
  companies: string[];
  hints: Bi[];
  followUp?: Bi;
}): WorkspaceProblem {
  return {
    id: params.id,
    leetcodeId: params.leetcodeId,
    slug: params.slug,
    title: params.title,
    difficulty: params.difficulty,
    pattern: params.pattern,
    targetMinutes: params.targetMinutes,
    companies: params.companies,
    statement: STATEMENT,
    example: EXAMPLE,
    hints: params.hints,
    followUp: params.followUp,
    referenceBigO: REFERENCE_BIG_O,
    seedCode: SEED_CODE,
    functionName: "threeSum",
    referenceSolution: REFERENCE_SOLUTION,
    tests: [
      {
        args: "[[-1,0,1,2,-1,-4]]",
        expected: [[-1, -1, 2], [-1, 0, 1]],
        compare: "unordered-triplets",
        visible: true,
      },
      {
        args: "[[0,1,1]]",
        expected: [],
        compare: "unordered-triplets",
        visible: true,
      },
      {
        args: "[[-2,0,0,2,2]]",
        expected: [[-2, 0, 2]],
        compare: "unordered-triplets",
        visible: true,
        diagnosis: DUP_DIAGNOSIS,
      },
      {
        args: "[[0,0,0]]",
        expected: [[0, 0, 0]],
        compare: "unordered-triplets",
        visible: false,
        diagnosis: DUP_DIAGNOSIS,
      },
      { args: "[[]]", expected: [], compare: "unordered-triplets", visible: false },
      { args: "[[1,2,-2,-1]]", expected: [], compare: "unordered-triplets", visible: false },
      {
        args: "[[-2,-2,-2,0,0,2,2,2]]",
        expected: [[-2, 0, 2]],
        compare: "unordered-triplets",
        visible: false,
        diagnosis: DUP_DIAGNOSIS,
      },
      {
        // 50-element fixed pseudo-random input — exercises a realistically sized
        // case, not just hand-picked edges. Expected value verified with an
        // independent, straightforwardly-correct reference implementation.
        args: "[[4,-2,14,7,-13,1,-9,5,15,-1,-10,16,10,-8,-12,0,8,5,-20,-1,14,-18,4,-19,-10,-18,-13,12,1,-19,-13,14,-1,13,-7,-2,-19,-18,2,4,-10,6,-12,-8,10,15,0,-12,-9,-8]]",
        expected: [
          [-20, 4, 16], [-20, 5, 15], [-20, 6, 14], [-20, 7, 13], [-20, 8, 12], [-20, 10, 10],
          [-19, 4, 15], [-19, 5, 14], [-19, 6, 13], [-19, 7, 12],
          [-18, 2, 16], [-18, 4, 14], [-18, 5, 13], [-18, 6, 12], [-18, 8, 10],
          [-13, -2, 15], [-13, -1, 14], [-13, 0, 13], [-13, 1, 12], [-13, 5, 8], [-13, 6, 7],
          [-12, -2, 14], [-12, -1, 13], [-12, 0, 12], [-12, 2, 10], [-12, 4, 8], [-12, 5, 7],
          [-10, -2, 12], [-10, 0, 10], [-10, 2, 8], [-10, 4, 6], [-10, 5, 5],
          [-9, -7, 16], [-9, -1, 10], [-9, 1, 8], [-9, 2, 7], [-9, 4, 5],
          [-8, -8, 16], [-8, -7, 15], [-8, -2, 10], [-8, 0, 8], [-8, 1, 7], [-8, 2, 6], [-8, 4, 4],
          [-7, -1, 8], [-7, 0, 7], [-7, 1, 6], [-7, 2, 5],
          [-2, -2, 4], [-2, 0, 2], [-2, 1, 1], [-1, -1, 2], [-1, 0, 1],
        ],
        compare: "unordered-triplets",
        visible: false,
      },
    ],
    solutions: [
      {
        title: { en: "Sort + two pointers", ru: "Сортировка + два указателя" },
        time: "O(n²)", space: "O(1)", mark: "canonical",
        note: {
          en: "The idiom this problem exists to teach. Beats the hash approach on space and reads cleaner.",
          ru: "Именно этому приёму и учит задача. Выигрывает у хеш-подхода по памяти и читается чище.",
        },
      },
      {
        title: { en: "Hash set on the inner pair", ru: "Хеш-множество на внутренней паре" },
        time: "O(n²)", space: "O(n)", mark: "same-bound",
        note: {
          en: "Skips the sort but needs a set per fixed index, and de-duplicating triplets gets fiddly.",
          ru: "Не требует сортировки, но нужен свой набор на каждый фиксированный индекс, а дедупликация троек становится муторной.",
        },
      },
      {
        title: { en: "Counting map for small ranges", ru: "Счётная карта для узкого диапазона" },
        time: "O(n²)", space: "O(n)", mark: "niche",
        note: {
          en: "Wins only when values are tightly bounded and repeats are dense. Worth reading, not memorising.",
          ru: "Выигрывает, только если значения сильно ограничены, а повторы плотные. Стоит прочитать, но не заучивать.",
        },
      },
    ],
  };
}
