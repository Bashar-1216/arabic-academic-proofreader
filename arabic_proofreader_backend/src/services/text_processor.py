import re
import requests
from typing import List, Dict, Tuple
import json

class ArabicTextProcessor:
    """Advanced Arabic text processing and proofreading service"""
    
    def __init__(self):
        self.common_errors = {
            # Common spelling mistakes
            'كتير': 'كثير',
            'شوي': 'قليل',
            'هيك': 'هكذا',
            'بس': 'لكن',
            'عشان': 'لأن',
            'لانه': 'لأنه',
            'لانها': 'لأنها',
            'مش': 'ليس',
            'ماشي': 'موافق',
            'اكتر': 'أكثر',
            'اقل': 'أقل',
            'احسن': 'أحسن',
            'اسوأ': 'أسوأ',
            
            # Academic improvements
            'يعني': 'أي',
            'زي': 'مثل',
            'علشان': 'لأجل',
            'خالص': 'تماماً',
            'كده': 'هكذا',
            'ده': 'هذا',
            'دي': 'هذه',
            'دول': 'هؤلاء',
        }
        
        self.academic_phrases = {
            'في النهاية': 'في الختام',
            'بصراحة': 'في الواقع',
            'الحقيقة': 'في الحقيقة',
            'يا ترى': 'من المحتمل',
            'ممكن': 'من الممكن',
            'لازم': 'يجب',
            'مفروض': 'من المفترض',
        }
        
        self.punctuation_rules = {
            # Arabic punctuation corrections
            r'\s+([،؛؟!.])': r'\1',  # Remove space before punctuation
            r'([،؛؟!.])\s*([^\s])': r'\1 \2',  # Add space after punctuation
            r'\.{2,}': '...',  # Fix multiple dots
            r'\?{2,}': '؟',  # Fix multiple question marks
            r'!{2,}': '!',  # Fix multiple exclamation marks
        }

    def clean_text(self, text: str) -> Tuple[str, List[Dict]]:
        """Clean and format Arabic text"""
        suggestions = []
        original_text = text
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Fix punctuation
        for pattern, replacement in self.punctuation_rules.items():
            new_text = re.sub(pattern, replacement, text)
            if new_text != text:
                suggestions.append({
                    'type': 'punctuation',
                    'original': text,
                    'suggestion': new_text,
                    'description': 'تصحيح علامات الترقيم'
                })
                text = new_text
        
        # Fix common Arabic writing issues
        # Hamza corrections
        hamza_corrections = {
            'أ': ['ا', 'إ'],  # Replace incorrect alif with hamza
            'إ': ['ا'],       # Replace alif with hamza under
        }
        
        # Fix Arabic numbers vs English numbers in Arabic text
        text = self._fix_numbers_in_arabic_text(text)
        
        return text, suggestions

    def _fix_numbers_in_arabic_text(self, text: str) -> str:
        """Convert English numbers to Arabic numbers in Arabic text"""
        english_to_arabic = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
        
        # Only convert numbers that are surrounded by Arabic text
        words = text.split()
        for i, word in enumerate(words):
            if re.search(r'[0-9]', word) and re.search(r'[\u0600-\u06FF]', word):
                words[i] = word.translate(english_to_arabic)
        
        return ' '.join(words)

    def correct_spelling(self, text: str) -> Tuple[str, List[Dict]]:
        """Correct common spelling mistakes"""
        suggestions = []
        corrected_text = text
        
        for incorrect, correct in self.common_errors.items():
            if incorrect in corrected_text:
                corrected_text = corrected_text.replace(incorrect, correct)
                suggestions.append({
                    'type': 'spelling',
                    'original': incorrect,
                    'suggestion': correct,
                    'description': f'تصحيح إملائي: "{incorrect}" إلى "{correct}"'
                })
        
        return corrected_text, suggestions

    def improve_academic_style(self, text: str) -> Tuple[str, List[Dict]]:
        """Improve academic writing style"""
        suggestions = []
        improved_text = text
        
        # Replace informal phrases with academic ones
        for informal, formal in self.academic_phrases.items():
            if informal in improved_text:
                improved_text = improved_text.replace(informal, formal)
                suggestions.append({
                    'type': 'style',
                    'original': informal,
                    'suggestion': formal,
                    'description': f'تحسين الأسلوب الأكاديمي: "{informal}" إلى "{formal}"'
                })
        
        # Check for passive voice and suggest active voice
        passive_suggestions = self._suggest_active_voice(improved_text)
        suggestions.extend(passive_suggestions)
        
        # Check sentence length and complexity
        complexity_suggestions = self._check_sentence_complexity(improved_text)
        suggestions.extend(complexity_suggestions)
        
        return improved_text, suggestions

    def _suggest_active_voice(self, text: str) -> List[Dict]:
        """Suggest active voice alternatives for passive constructions"""
        suggestions = []
        
        # Common passive voice patterns in Arabic
        passive_patterns = [
            (r'تم\s+(\w+)', r'قام الباحث بـ\1'),
            (r'يتم\s+(\w+)', r'يقوم الباحث بـ\1'),
            (r'تمت\s+(\w+)', r'قامت الدراسة بـ\1'),
        ]
        
        for pattern, replacement in passive_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                suggestions.append({
                    'type': 'voice',
                    'original': match.group(0),
                    'suggestion': re.sub(pattern, replacement, match.group(0)),
                    'description': 'اقتراح استخدام المبني للمعلوم بدلاً من المبني للمجهول'
                })
        
        return suggestions

    def _check_sentence_complexity(self, text: str) -> List[Dict]:
        """Check sentence complexity and suggest improvements"""
        suggestions = []
        
        sentences = re.split(r'[.؟!]', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            word_count = len(sentence.split())
            
            # Suggest breaking long sentences
            if word_count > 25:
                suggestions.append({
                    'type': 'complexity',
                    'original': sentence,
                    'suggestion': 'فكر في تقسيم هذه الجملة إلى جملتين أقصر',
                    'description': f'الجملة طويلة ({word_count} كلمة) - يُنصح بتقسيمها'
                })
            
            # Check for too many conjunctions
            conjunctions = ['و', 'أو', 'لكن', 'غير أن', 'إلا أن', 'بينما']
            conjunction_count = sum(sentence.count(conj) for conj in conjunctions)
            
            if conjunction_count > 3:
                suggestions.append({
                    'type': 'complexity',
                    'original': sentence,
                    'suggestion': 'فكر في تبسيط الجملة وتقليل أدوات الربط',
                    'description': 'الجملة تحتوي على أدوات ربط كثيرة'
                })
        
        return suggestions

    def check_academic_terminology(self, text: str) -> List[Dict]:
        """Check and suggest academic terminology"""
        suggestions = []
        
        # Academic terminology suggestions
        academic_terms = {
            'بحث': 'دراسة',
            'شغل': 'عمل',
            'حاجة': 'أمر',
            'موضوع': 'قضية',
            'مشكلة': 'إشكالية',
            'فكرة': 'مفهوم',
            'رأي': 'وجهة نظر',
            'كلام': 'قول',
        }
        
        for informal, formal in academic_terms.items():
            if informal in text:
                suggestions.append({
                    'type': 'terminology',
                    'original': informal,
                    'suggestion': formal,
                    'description': f'استخدام مصطلح أكاديمي: "{formal}" بدلاً من "{informal}"'
                })
        
        return suggestions

    def check_citation_format(self, text: str) -> List[Dict]:
        """Check citation format and suggest improvements"""
        suggestions = []
        
        # Look for potential citations that need formatting
        citation_patterns = [
            r'\([^)]*\d{4}[^)]*\)',  # (Author, 2023)
            r'\[[^\]]*\d{4}[^\]]*\]',  # [Author, 2023]
        ]
        
        for pattern in citation_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                citation = match.group(0)
                if not re.match(r'\([^,]+,\s*\d{4}\)', citation):
                    suggestions.append({
                        'type': 'citation',
                        'original': citation,
                        'suggestion': 'تأكد من تنسيق المرجع: (المؤلف، السنة)',
                        'description': 'تحسين تنسيق المراجع'
                    })
        
        return suggestions

    def process_text(self, text: str) -> Dict:
        """Main text processing function"""
        all_suggestions = []
        processed_text = text
        
        # Step 1: Clean text
        processed_text, clean_suggestions = self.clean_text(processed_text)
        all_suggestions.extend(clean_suggestions)
        
        # Step 2: Correct spelling
        processed_text, spelling_suggestions = self.correct_spelling(processed_text)
        all_suggestions.extend(spelling_suggestions)
        
        # Step 3: Improve academic style
        processed_text, style_suggestions = self.improve_academic_style(processed_text)
        all_suggestions.extend(style_suggestions)
        
        # Step 4: Check terminology
        terminology_suggestions = self.check_academic_terminology(processed_text)
        all_suggestions.extend(terminology_suggestions)
        
        # Step 5: Check citations
        citation_suggestions = self.check_citation_format(processed_text)
        all_suggestions.extend(citation_suggestions)
        
        return {
            'original_text': text,
            'processed_text': processed_text,
            'suggestions': all_suggestions,
            'stats': {
                'original_words': len(text.split()),
                'processed_words': len(processed_text.split()),
                'suggestions_count': len(all_suggestions),
                'improvement_types': list(set(s['type'] for s in all_suggestions))
            }
        }

