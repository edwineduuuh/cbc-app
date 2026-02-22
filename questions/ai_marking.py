import re
from difflib import SequenceMatcher
import sympy as sp

class AIMarkingEngine:
    
    @staticmethod
    def mark_fill_blank(student_answer, correct_answers, case_sensitive=False):
        student = student_answer.strip()
        
        for correct in correct_answers:
            correct = correct.strip()
            
            if not case_sensitive:
                student = student.lower()
                correct = correct.lower()
            
            if student == correct:
                return {'score': 1, 'feedback': 'Correct!'}
            
            similarity = SequenceMatcher(None, student, correct).ratio()
            if similarity > 0.85:
                return {'score': 0.5, 'feedback': f'Close! Did you mean "{correct}"?'}
        
        return {'score': 0, 'feedback': 'Incorrect'}
    
    @staticmethod
    def mark_math(student_answer, correct_answers, options=None):
        options = options or {'allow_decimals': True, 'tolerance': 0.01}
        
        try:
            # Clean the input
            student_expr = student_answer.replace(' ', '')
            student_expr = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', student_expr)
            
            # Try to parse
            student_sym = sp.sympify(student_expr)
            
            for correct in correct_answers:
                correct_sym = sp.sympify(correct)
                
                # Check exact equivalence
                if sp.simplify(student_sym - correct_sym) == 0:
                    return {'score': 1, 'feedback': '✓ Correct!'}
                
                # Check approximate if allowed
                if options.get('allow_decimals'):
                    try:
                        student_num = float(student_sym)
                        correct_num = float(correct_sym)
                        if abs(student_num - correct_num) <= options.get('tolerance', 0.01):
                            return {'score': 1, 'feedback': '✓ Correct (within tolerance)'}
                    except:
                        pass
            
            return {'score': 0, 'feedback': '✗ Incorrect'}
            
        except Exception as e:
            return {'score': 0, 'feedback': 'Invalid mathematical expression'}