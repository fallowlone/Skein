# Algorithms Unit 12 Lesson 1: Bit Manipulation Toolbox

## Overview
First lesson in the algorithms unit 12 (toolbox) focusing on bit manipulation as a problem-solving tool. Targets absolute beginners who know one programming language but have never studied algorithms.

## Learning Objectives
After this lesson, students will be able to:
- Define what bit manipulation is and why it's useful as an algorithmic tool
- Use basic bitwise operators (AND, OR, XOR, NOT, left shift, right shift)
- Apply common bit manipulation tricks (checking power of two, counting bits, etc.)
- Recognize when bit manipulation is the appropriate tool for a problem
- Explain the time and space complexity of bit manipulation operations

## Lesson Structure (Algorithms Skeleton)
Following the standard algorithms lesson skeleton: Hook → Goal → Idea → Code → Trace → Complexity → Practice → Check → Recap

### Hook
Present a motivating problem that is solved efficiently with bit manipulation but would be awkward or slow with naive approaches. Example: "How can you quickly determine if a number is a power of two?" or "Given a list of integers where every element appears twice except one, find the single one."

### Goal
Clearly state what students will accomplish:
- Understand bitwise operators and their behavior
- Learn to manipulate individual bits to solve problems efficiently
- Recognize common patterns where bit manipulation excels
- Apply bit manipulation to solve specific algorithmic problems

### Idea
Explain the concept of bit manipulation:
- Computers store integers as sequences of bits (0s and 1s)
- Bitwise operators work on individual bits rather than whole numbers
- Why bit manipulation is powerful: constant-time operations on individual bits
- Introduce the six main bitwise operators:
  - AND (&): sets bit to 1 only if both bits are 1
  - OR (|): sets bit to 1 if at least one bit is 1
  - XOR (^): sets bit to 1 if bits are different
  - NOT (~): flips all bits
  - Left shift (<<): moves bits left, filling with 0s (multiplies by 2^n)
  - Right shift (>>): moves bits right (divides by 2^n, implementation-dependent for sign)
- Show how these operators enable common tricks:
  - Check if number is power of two: `(n & (n-1)) == 0`
  - Count set bits: Brian Kernighan's algorithm or built-in methods
  - Swap two variables without temporary variable using XOR
  - Check if two numbers have opposite signs using XOR

### Code
Provide concrete TypeScript/JavaScript examples:
```typescript
// Basic bitwise operations
function bitwiseBasics(a: number, b: number): void {
  console.log(`a & b = ${a & b}`);   // AND
  console.log(`a | b = ${a | b}`);   // OR
  console.log(`a ^ b = ${a ^ b}`);   // XOR
  console.log(`~a = ${~a}`);         // NOT
  console.log(`a << 2 = ${a << 2}`); // Left shift
  console.log(`a >> 1 = ${a >> 1}`); // Right shift
}

// Common bit manipulation tricks
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

function countBits(n: number): number {
  let count = 0;
  while (n) {
    n &= (n - 1); // Clear least significant set bit
    count++;
  }
  return count;
}

function findSingleNumber(nums: number[]): number {
  let result = 0;
  for (const num of nums) {
    result ^= num;
  }
  return result;
}
```

### Trace
Walk through examples step-by-step:
1. Trace `isPowerOfTwo(8)`:
   - 8 in binary: 1000
   - 7 in binary: 0111
   - 8 & 7 = 0000 = 0 → returns true
2. Trace `countBits(13)`:
   - 13 = 1101 (3 bits set)
   - Iteration 1: 1101 & 1100 = 1100, count=1
   - Iteration 2: 1100 & 1011 = 1000, count=2  
   - Iteration 3: 1000 & 0111 = 0000, count=3
   - Returns 3
3. Trace `findSingleNumber([4,1,2,1,2])`:
   - Start: result = 0
   - 0 ^ 4 = 4
   - 4 ^ 1 = 5
   - 5 ^ 2 = 7
   - 7 ^ 1 = 6
   - 6 ^ 2 = 4 → returns 4

### Complexity
Analyze time and space complexity:
- Basic bitwise operations: O(1) time, O(1) space
- Bit counting (Brian Kernighan's): O(k) time where k is number of set bits, O(1) space
- Finding single number in array: O(n) time, O(1) space
- Emphasize that bit manipulation operations are typically constant-time and very fast
- Contrast with naive approaches that might use loops, recursion, or extra data structures

### Practice
Provide >=4 practice problems:
1. Given an integer, count how many bits are set to 1 (Hamming weight)
2. Determine if two integers have opposite signs without using comparison operators
3. Swap two numbers without using a temporary variable
4. Find the number that appears once in an array where all other numbers appear three times
5. Calculate the number of 1 bits in the binary representation of a number (LeetCode 191)
6. Reverse bits of a given 32-bit unsigned integer (LeetCode 190)

### Check
Quiz questions to verify understanding:
- What does `5 & 3` evaluate to? (Answer: 1)
- What is the result of `1 << 5`? (Answer: 32)
- How can you check if a number is even using bitwise operators? (Answer: `(n & 1) === 0`)
- Which bitwise operator is useful for toggling bits? (Answer: XOR)
- What does `n & (n-1)` do to the binary representation of n? (Answer: Clears the least significant set bit)

### Recap
Review key takeaways:
- Bit manipulation allows efficient, constant-time operations on individual bits
- The six bitwise operators (AND, OR, XOR, NOT, left shift, right shift) are fundamental tools
- Common tricks include: checking power of two, counting bits, swapping variables, finding unique elements
- Bit manipulation is particularly useful for: flags/masks, cryptography, low-level optimization, certain algorithmic patterns
- Time complexity is typically O(1) per operation, making it very efficient
- The key is recognizing when a problem can be solved by manipulating bits directly rather than working with whole numbers

## Inset Blocks (Where Useful)
- **why**: Explain why bit manipulation matters in real-world applications (embedded systems, networking, cryptography)
- **mistake**: Warning about assuming bit manipulation is always faster - modern compilers often optimize equivalent arithmetic operations
- **edgecase**: Discuss behavior of right shift on negative numbers (implementation-dependent in JavaScript/TypeScript)
- **practice**: Bit manipulation checklist: (1) Can the problem be viewed in terms of individual bits? (2) Are we setting, clearing, or checking specific bit patterns? (3) Would bitwise operations simplify the logic?

## Prerequisites
- Basic programming knowledge (variables, loops, conditionals)
- No prior knowledge of binary numbers required - will be introduced as needed
- No math beyond basic arithmetic

## Sources
- Hacker's Delight by Henry S. Warren Jr.
- Bitwise Operators in JavaScript - MDN Web Docs
- Topcoder tutorials on bit manipulation
- LeetCode explore card: Bit Manipulation
- CLRS Introduction to Algorithms (section on bit vectors)

## Estimated Time
24 minutes

## Status
Ready for implementation