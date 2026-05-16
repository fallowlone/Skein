import json, re
from pathlib import Path

LESS = 'site/src/content/lessons/en/math'


def norm(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


# unit dir -> [lesson dirs]
units = {
    '01-numbers': ['01-counting', '02-comparing', '03-place-value'],
    '02-operations': ['01-addition', '02-subtraction', '03-multiplication', '04-division'],
    '03-fractions': ['01-what-is-a-fraction', '02-equivalent-fractions',
                     '03-adding-fractions', '04-decimals', '05-percents'],
    '04-powers': ['01-exponents', '02-powers-of-ten', '03-square-roots'],
    '05-algebra': ['01-variables', '02-expressions', '03-equations', '04-inequalities'],
    '06-functions': ['01-what-is-a-function', '02-linear-functions', '03-graphs'],
    '07-logic': ['01-true-and-false', '02-and-or-not', '03-sets'],
    '08-growth': ['01-linear-vs-exponential', '02-logarithms'],
    '09-combinatorics': ['01-counting-principle', '02-permutations', '03-combinations'],
    '10-probability': ['01-what-is-probability', '02-combining-events'],
}

# lesson key "unit/lesson" -> (doc_id, file_path)
docs = {}
for unit, lessons in units.items():
    for lesson in lessons:
        key = '%s/%s' % (unit, lesson)
        did = 'doc_en_math_%s_%s' % (norm(unit), norm(lesson))
        docs[key] = (did, '%s/%s/%s/index.mdx' % (LESS, unit, lesson))

concepts = {
    'counting': 'Counting', 'natural_numbers': 'Natural numbers',
    'set_cardinality': 'Cardinality of a set', 'number_comparison': 'Comparing numbers',
    'comparison_signs': 'Greater-than / less-than signs', 'number_ordering': 'Ordering numbers',
    'place_value': 'Place value', 'positional_system': 'Decimal positional system',
    'digit_position': 'Digit position and worth', 'addition': 'Addition',
    'sum': 'Sum and addends', 'counting_on': 'Counting on', 'number_line': 'Number line',
    'commutativity': 'Order does not matter (commutativity)',
    'regrouping': 'Regrouping (carry / borrow)', 'subtraction': 'Subtraction',
    'difference': 'Difference', 'inverse_operations': 'Inverse operations',
    'multiplication': 'Multiplication', 'product': 'Product and factors',
    'repeated_addition': 'Repeated addition', 'partial_products': 'Partial products',
    'division': 'Division', 'quotient': 'Quotient', 'remainder': 'Remainder',
    'divide_by_zero': 'Division by zero is undefined', 'fraction': 'Fraction',
    'numerator_denominator': 'Numerator and denominator', 'equal_parts': 'Equal parts',
    'equivalent_fractions': 'Equivalent fractions', 'simplest_form': 'Simplest form',
    'adding_fractions': 'Adding fractions', 'common_denominator': 'Common denominator',
    'decimal': 'Decimal', 'decimal_point': 'Decimal point',
    'decimal_places': 'Tenths and hundredths',
    'fraction_decimal_link': 'Fraction-decimal-percent equivalence',
    'percent': 'Percent', 'percent_of': 'Percent of a number', 'exponent': 'Exponent',
    'exponent_base': 'Base of a power', 'repeated_multiplication': 'Repeated multiplication',
    'exponential_explosion': 'Explosive growth of exponents',
    'power_of_ten': 'Powers of ten', 'scientific_form': 'Scientific form',
    'square_root': 'Square root', 'perfect_square': 'Perfect square', 'squaring': 'Squaring',
    'variable': 'Variable', 'substitution': 'Substitution', 'expression': 'Expression',
    'like_terms': 'Terms and like terms', 'equation': 'Equation',
    'solving_equations': 'Solving equations', 'balance_rule': 'Balance rule',
    'inequality': 'Inequality', 'solution_range': 'Solution range', 'function': 'Function',
    'function_io': 'Input and output', 'linear_function': 'Linear function',
    'slope': 'Slope and starting value', 'graph': 'Graph of a function',
    'coordinate_point': 'Coordinate point', 'statement': 'Statement (true or false)',
    'truth_value': 'Truth value', 'logical_connectives': 'AND, OR, NOT',
    'math_set': 'Set', 'set_membership': 'Set membership',
    'union_intersection': 'Union and intersection', 'linear_growth': 'Linear growth',
    'exponential_growth': 'Exponential growth', 'logarithm': 'Logarithm',
    'counting_principle': 'Counting principle', 'permutation': 'Permutation',
    'factorial': 'Factorial', 'combination': 'Combination', 'probability': 'Probability',
    'probability_scale': 'The 0-to-1 probability scale',
    'favourable_outcomes': 'Favourable outcomes',
    'combining_probabilities': 'Combining event probabilities',
    'complement': 'Complement of an event',
}

lesson_concepts = {
    '01-numbers/01-counting': ['counting', 'natural_numbers', 'set_cardinality'],
    '01-numbers/02-comparing': ['number_comparison', 'comparison_signs', 'number_ordering'],
    '01-numbers/03-place-value': ['place_value', 'positional_system', 'digit_position'],
    '02-operations/01-addition': ['addition', 'sum', 'counting_on', 'number_line',
        'commutativity', 'regrouping', 'place_value'],
    '02-operations/02-subtraction': ['subtraction', 'difference', 'inverse_operations',
        'number_line', 'regrouping', 'place_value'],
    '02-operations/03-multiplication': ['multiplication', 'product', 'repeated_addition',
        'commutativity', 'partial_products', 'number_line', 'place_value'],
    '02-operations/04-division': ['division', 'quotient', 'remainder', 'divide_by_zero',
        'inverse_operations', 'multiplication', 'number_line'],
    '03-fractions/01-what-is-a-fraction': ['fraction', 'numerator_denominator',
        'equal_parts', 'division'],
    '03-fractions/02-equivalent-fractions': ['equivalent_fractions', 'simplest_form',
        'fraction'],
    '03-fractions/03-adding-fractions': ['adding_fractions', 'common_denominator',
        'equivalent_fractions'],
    '03-fractions/04-decimals': ['decimal', 'decimal_point', 'decimal_places',
        'place_value', 'fraction'],
    '03-fractions/05-percents': ['percent', 'percent_of', 'fraction_decimal_link',
        'decimal', 'fraction'],
    '04-powers/01-exponents': ['exponent', 'exponent_base', 'repeated_multiplication',
        'exponential_explosion', 'multiplication'],
    '04-powers/02-powers-of-ten': ['power_of_ten', 'scientific_form', 'exponent',
        'place_value'],
    '04-powers/03-square-roots': ['square_root', 'perfect_square', 'squaring',
        'inverse_operations', 'exponent'],
    '05-algebra/01-variables': ['variable', 'substitution'],
    '05-algebra/02-expressions': ['expression', 'like_terms', 'variable', 'substitution'],
    '05-algebra/03-equations': ['equation', 'solving_equations', 'balance_rule',
        'inverse_operations', 'expression'],
    '05-algebra/04-inequalities': ['inequality', 'solution_range', 'comparison_signs',
        'equation'],
    '06-functions/01-what-is-a-function': ['function', 'function_io'],
    '06-functions/02-linear-functions': ['linear_function', 'slope', 'function'],
    '06-functions/03-graphs': ['graph', 'coordinate_point', 'linear_function'],
    '07-logic/01-true-and-false': ['statement', 'truth_value'],
    '07-logic/02-and-or-not': ['logical_connectives', 'statement', 'truth_value'],
    '07-logic/03-sets': ['math_set', 'set_membership', 'union_intersection'],
    '08-growth/01-linear-vs-exponential': ['linear_growth', 'exponential_growth',
        'linear_function', 'exponent'],
    '08-growth/02-logarithms': ['logarithm', 'exponent', 'inverse_operations',
        'exponential_growth'],
    '09-combinatorics/01-counting-principle': ['counting_principle', 'multiplication'],
    '09-combinatorics/02-permutations': ['permutation', 'factorial', 'counting_principle'],
    '09-combinatorics/03-combinations': ['combination', 'factorial', 'permutation'],
    '10-probability/01-what-is-probability': ['probability', 'probability_scale',
        'favourable_outcomes', 'fraction'],
    '10-probability/02-combining-events': ['combining_probabilities', 'complement',
        'probability', 'logical_connectives'],
}

R = 'conceptually_related_to'
S = 'semantically_similar_to'
relations = [
    ('counting', 'natural_numbers', R, 0.95),
    ('counting', 'set_cardinality', R, 0.95),
    ('counting', 'number_comparison', R, 0.85),
    ('number_comparison', 'comparison_signs', R, 0.95),
    ('number_comparison', 'number_ordering', R, 0.95),
    ('place_value', 'positional_system', R, 0.95),
    ('place_value', 'digit_position', R, 0.95),
    ('addition', 'sum', R, 0.95),
    ('addition', 'counting_on', R, 0.95),
    ('counting_on', 'number_line', R, 0.95),
    ('addition', 'commutativity', R, 0.85),
    ('addition', 'regrouping', R, 0.85),
    ('addition', 'subtraction', R, 0.95),
    ('subtraction', 'difference', R, 0.95),
    ('subtraction', 'inverse_operations', R, 0.95),
    ('subtraction', 'regrouping', R, 0.85),
    ('multiplication', 'product', R, 0.95),
    ('multiplication', 'repeated_addition', R, 0.95),
    ('repeated_addition', 'addition', R, 0.85),
    ('multiplication', 'commutativity', R, 0.85),
    ('multiplication', 'partial_products', R, 0.85),
    ('multiplication', 'division', R, 0.95),
    ('division', 'quotient', R, 0.95),
    ('division', 'remainder', R, 0.95),
    ('division', 'divide_by_zero', R, 0.85),
    ('division', 'inverse_operations', R, 0.95),
    ('regrouping', 'place_value', R, 0.85),
    ('fraction', 'numerator_denominator', R, 0.95),
    ('fraction', 'equal_parts', R, 0.95),
    ('fraction', 'division', R, 0.75),
    ('equivalent_fractions', 'simplest_form', R, 0.95),
    ('equivalent_fractions', 'fraction', R, 0.95),
    ('adding_fractions', 'common_denominator', R, 0.95),
    ('adding_fractions', 'equivalent_fractions', R, 0.85),
    ('decimal', 'decimal_point', R, 0.95),
    ('decimal', 'decimal_places', R, 0.95),
    ('decimal', 'place_value', R, 0.85),
    ('decimal', 'fraction', R, 0.85),
    ('percent', 'percent_of', R, 0.95),
    ('percent', 'fraction_decimal_link', R, 0.95),
    ('fraction_decimal_link', 'decimal', R, 0.85),
    ('exponent', 'exponent_base', R, 0.95),
    ('exponent', 'repeated_multiplication', R, 0.95),
    ('repeated_multiplication', 'multiplication', R, 0.85),
    ('exponent', 'exponential_explosion', R, 0.95),
    ('power_of_ten', 'exponent', R, 0.95),
    ('power_of_ten', 'place_value', R, 0.85),
    ('power_of_ten', 'scientific_form', R, 0.95),
    ('square_root', 'squaring', R, 0.95),
    ('square_root', 'perfect_square', R, 0.95),
    ('square_root', 'inverse_operations', R, 0.85),
    ('squaring', 'exponent', R, 0.95),
    ('variable', 'substitution', R, 0.95),
    ('expression', 'like_terms', R, 0.95),
    ('expression', 'variable', R, 0.95),
    ('equation', 'solving_equations', R, 0.95),
    ('equation', 'balance_rule', R, 0.95),
    ('solving_equations', 'inverse_operations', R, 0.85),
    ('equation', 'expression', R, 0.85),
    ('inequality', 'solution_range', R, 0.95),
    ('inequality', 'comparison_signs', R, 0.85),
    ('inequality', 'equation', R, 0.95),
    ('function', 'function_io', R, 0.95),
    ('linear_function', 'slope', R, 0.95),
    ('linear_function', 'function', R, 0.95),
    ('graph', 'coordinate_point', R, 0.95),
    ('graph', 'linear_function', R, 0.95),
    ('statement', 'truth_value', R, 0.95),
    ('logical_connectives', 'statement', R, 0.95),
    ('math_set', 'set_membership', R, 0.95),
    ('math_set', 'union_intersection', R, 0.95),
    ('linear_growth', 'exponential_growth', R, 0.95),
    ('linear_growth', 'linear_function', R, 0.85),
    ('exponential_growth', 'exponent', R, 0.95),
    ('logarithm', 'exponent', R, 0.95),
    ('logarithm', 'inverse_operations', R, 0.85),
    ('logarithm', 'exponential_growth', R, 0.85),
    ('counting_principle', 'multiplication', R, 0.85),
    ('permutation', 'factorial', R, 0.95),
    ('permutation', 'counting_principle', R, 0.95),
    ('combination', 'permutation', R, 0.95),
    ('combination', 'factorial', R, 0.85),
    ('probability', 'probability_scale', R, 0.95),
    ('probability', 'favourable_outcomes', R, 0.95),
    ('probability', 'fraction', R, 0.85),
    ('combining_probabilities', 'complement', R, 0.95),
    ('combining_probabilities', 'probability', R, 0.95),
    ('combining_probabilities', 'logical_connectives', R, 0.75),
    ('subtraction', 'addition', S, 0.85),
    ('division', 'multiplication', S, 0.85),
    ('square_root', 'squaring', S, 0.85),
    ('logarithm', 'exponent', S, 0.85),
]

# build nodes + edges
nodes = {}
owner = {}
for lk, clist in lesson_concepts.items():
    for c in clist:
        owner.setdefault(c, lk)
for slug, label in concepts.items():
    if slug not in owner:
        raise SystemExit('unused concept: ' + slug)
    nodes['concept_' + slug] = {
        'id': 'concept_' + slug, 'label': label, 'file_type': 'concept',
        'source_file': docs[owner[slug]][1], 'source_location': None,
        'source_url': None, 'captured_at': None, 'author': None, 'contributor': None,
    }

edges = []
for lk, clist in lesson_concepts.items():
    did, df = docs[lk]
    for c in clist:
        if c not in concepts:
            raise SystemExit('unknown concept %s in %s' % (c, lk))
        edges.append({'source': did, 'target': 'concept_' + c, 'relation': 'references',
                      'confidence': 'EXTRACTED', 'confidence_score': 1.0,
                      'source_file': df, 'weight': 1.0})
for a, b, rel, sc in relations:
    for x in (a, b):
        if x not in concepts:
            raise SystemExit('unknown concept in relation: ' + x)
    edges.append({'source': 'concept_' + a, 'target': 'concept_' + b, 'relation': rel,
                  'confidence': 'INFERRED', 'confidence_score': sc,
                  'source_file': LESS, 'weight': 1.0})

out = {'nodes': list(nodes.values()), 'edges': edges, 'hyperedges': [],
       'input_tokens': 0, 'output_tokens': 0}
Path('graphify-out/.relinear_chunk_math.json').write_text(
    json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
print('math: %d concepts, %d edges, %d lessons' % (len(nodes), len(edges), len(lesson_concepts)))
