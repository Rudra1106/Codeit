# 1. What is vocabulary size?
Suppose our vocabulary is:
vocabulary size = 10,000
This means the model knows 10,000 distinct tokens.
For a simple example, imagine a tiny vocabulary of only 5 tokens:
    0 → I
    1 → like
    2 → cats
    3 → dogs
    4 → pizza
The model doesn't directly work with the words "cats" or "pizza". It first converts them into token IDs:
"I like cats"
    I     → 0
    like  → 1
    cats  → 2

So the input becomes:
[0, 1, 2]
The vocabulary is essentially the mapping:
token/word → integer ID
# 2. Why do we need an embedding table?
Neural networks work with numbers, but a token ID such as:
cats = 2
doesn't contain useful information about the meaning of "cats."
For example, the model shouldn't interpret:
    cats = 2
    dogs = 3
    pizza = 4
as meaning that dogs are mathematically closer to cats than pizza is simply because 3 is closer to 2.
Instead, we give every token a vector that the model can learn.
Suppose our toy model has:
embedding dimension = 4
The embedding table might look like:

Token ID	Token	Embedding
    0	    I	    [0.2, -0.1, 0.7, 0.3]
    1	    like	[0.5, 0.8, -0.2, 0.1]
    2	    cats	[0.9, 0.1, 0.6, -0.3]
    3	    dogs	[0.8, 0.2, 0.5, -0.2]
    4	    pizza	[-0.1, 0.7, -0.4, 0.9]

Now "cats" is represented by:
[0.9, 0.1, 0.6, -0.3]
This vector is called its embedding.

# 3. So why is the table 10000 × 512?
Your model has:
vocabulary size = 10,000
embedding dimension = 512
Therefore, we need:
10,000 rows
×
512 numbers per row
giving:
Embedding table = 10,000 × 512
Think of it as:

                 512-dimensional vector
              <------------------------>
Token 0   →    [ ... 512 numbers ... ]
Token 1   →    [ ... 512 numbers ... ]
Token 2   →    [ ... 512 numbers ... ]
   .
   .
   .
Token 9999 →   [ ... 512 numbers ... ]
There is one row for every token in the vocabulary.

# 4. What happens when we input a sentence?
Suppose:
"I like cats"
The tokenizer produces:
    I     → 0
    like  → 1
    cats  → 2
So:
[0, 1, 2]
The model then looks up those rows in the embedding table:
0 → embedding row 0 → 512 numbers
1 → embedding row 1 → 512 numbers
2 → embedding row 2 → 512 numbers
Therefore:
[0, 1, 2]
becomes something like:
[
  [0.2, ..., 0.3],   ← I
  [0.5, ..., 0.1],   ← like
  [0.9, ..., -0.3]   ← cats
]

The resulting shape is:
3 × 512
because there are 3 tokens, and each token has a 512-dimensional embedding.
