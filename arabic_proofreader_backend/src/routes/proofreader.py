from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import tempfile
from src.services.file_extractor import FileExtractor
from src.services.text_processor import ArabicTextProcessor

proofreader_bp = Blueprint('proofreader', __name__)

# Initialize services
file_extractor = FileExtractor()
text_processor = ArabicTextProcessor()

@proofreader_bp.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and text extraction"""
    if 'file' not in request.files:
        return jsonify({'error': 'لم يتم اختيار ملف'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'لم يتم اختيار ملف'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
        
        try:
            # Get file info first
            file_info = file_extractor.get_file_info(temp_path, filename)
            
            if 'error' in file_info:
                os.unlink(temp_path)
                return jsonify({'error': file_info['error']}), 500
            
            if not file_info['is_supported']:
                os.unlink(temp_path)
                return jsonify({'error': 'نوع الملف غير مدعوم. يرجى رفع ملف PDF أو Word'}), 400
            
            if not file_info['size_valid']:
                os.unlink(temp_path)
                return jsonify({'error': 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'}), 400
            
            # Extract text
            extraction_result = file_extractor.extract_text(temp_path, filename)
            
            # Clean up temporary file
            os.unlink(temp_path)
            
            if not extraction_result['success']:
                return jsonify({'error': extraction_result['error']}), 500
            
            # CORRECTED CODE
            final_metadata = file_info

            final_metadata.update(extraction_result.get('metadata', {}))

            return jsonify({
                'success': True,
                'text': extraction_result['text'],
                'metadata': final_metadata, # <-- The corrected key
                'stats': extraction_result.get('stats', {})
            })
            
        except Exception as e:
            # Clean up temporary file in case of error
            if os.path.exists(temp_path):
                os.unlink(temp_path)
            return jsonify({'error': f'خطأ في معالجة الملف: {str(e)}'}), 500
    
    return jsonify({'error': 'خطأ في رفع الملف'}), 400

@proofreader_bp.route('/proofread', methods=['POST'])
def proofread_text():
    """Proofread and improve Arabic text using advanced processing"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'النص مطلوب'}), 400
    
    text = data['text']
    
    if not text.strip():
        return jsonify({'error': 'النص فارغ'}), 400
    
    try:
        # Process text using the advanced text processor
        result = text_processor.process_text(text)
        
        return jsonify({
            'success': True,
            'original_text': result['original_text'],
            'corrected_text': result['processed_text'],
            'suggestions': result['suggestions'],
            'stats': result['stats']
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في التدقيق: {str(e)}'}), 500

@proofreader_bp.route('/analyze', methods=['POST'])
def analyze_text():
    """Analyze text and provide detailed statistics"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'النص مطلوب'}), 400
    
    text = data['text']
    
    if not text.strip():
        return jsonify({'error': 'النص فارغ'}), 400
    
    try:
        # Basic text analysis
        words = text.split()
        sentences = len([s for s in text.split('.') if s.strip()])
        paragraphs = len([p for p in text.split('\n\n') if p.strip()])
        
        # Character analysis
        arabic_chars = len([c for c in text if '\u0600' <= c <= '\u06FF'])
        english_chars = len([c for c in text if c.isalpha() and not ('\u0600' <= c <= '\u06FF')])
        numbers = len([c for c in text if c.isdigit()])
        
        # Readability metrics
        avg_words_per_sentence = len(words) / max(sentences, 1)
        avg_chars_per_word = len([c for c in text if c.isalpha()]) / max(len(words), 1)
        
        return jsonify({
            'success': True,
            'analysis': {
                'word_count': len(words),
                'character_count': len(text),
                'sentence_count': sentences,
                'paragraph_count': paragraphs,
                'arabic_characters': arabic_chars,
                'english_characters': english_chars,
                'numbers': numbers,
                'avg_words_per_sentence': round(avg_words_per_sentence, 2),
                'avg_chars_per_word': round(avg_chars_per_word, 2),
                'readability': {
                    'complexity': 'بسيط' if avg_words_per_sentence < 15 else 'متوسط' if avg_words_per_sentence < 25 else 'معقد',
                    'recommendation': 'النص مناسب للقراءة الأكاديمية' if 15 <= avg_words_per_sentence <= 25 else 'يُنصح بتبسيط الجمل' if avg_words_per_sentence > 25 else 'يمكن تطوير تعقيد الجمل'
                }
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في التحليل: {str(e)}'}), 500

@proofreader_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Arabic Proofreader API',
        'version': '2.0.0',
        'features': [
            'file_extraction',
            'text_processing',
            'academic_style_improvement',
            'spelling_correction',
            'text_analysis'
        ]
    })

