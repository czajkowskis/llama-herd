"""
Unit tests for case conversion utilities.
"""
import pytest
from app.utils.case_converter import camel_to_snake, snake_to_camel


@pytest.mark.unit
class TestCaseConverter:
    """Test cases for case conversion utilities."""
    
    def test_camel_to_snake_simple(self):
        """Test simple camelCase to snake_case conversion."""
        # Act & Assert
        assert camel_to_snake("camelCase") == "camel_case"
        assert camel_to_snake("simpleTest") == "simple_test"
        assert camel_to_snake("myVariable") == "my_variable"
    
    def test_camel_to_snake_multiple_words(self):
        """Test camelCase with multiple words."""
        # Act & Assert
        assert camel_to_snake("thisIsALongVariableName") == "this_is_a_long_variable_name"
        assert camel_to_snake("userAccountBalance") == "user_account_balance"
        assert camel_to_snake("httpResponseCode") == "http_response_code"
    
    def test_camel_to_snake_with_numbers(self):
        """Test camelCase with numbers."""
        # Act & Assert
        assert camel_to_snake("version2") == "version2"
        assert camel_to_snake("testCase1") == "test_case1"
        assert camel_to_snake("apiV2Response") == "api_v2_response"
    
    def test_camel_to_snake_already_snake(self):
        """Test that snake_case input remains unchanged."""
        # Act & Assert
        assert camel_to_snake("already_snake_case") == "already_snake_case"
        assert camel_to_snake("simple_test") == "simple_test"
        assert camel_to_snake("multi_word_test") == "multi_word_test"
    
    def test_camel_to_snake_empty_string(self):
        """Test empty string input."""
        # Act & Assert
        assert camel_to_snake("") == ""
    
    def test_camel_to_snake_single_word(self):
        """Test single word input."""
        # Act & Assert
        assert camel_to_snake("word") == "word"
        assert camel_to_snake("Word") == "word"
        assert camel_to_snake("WORD") == "word"  # All caps becomes lowercase
    
    def test_camel_to_snake_special_cases(self):
        """Test special cases and edge cases."""
        # Act & Assert
        assert camel_to_snake("XMLHttpRequest") == "xml_http_request"
        assert camel_to_snake("HTMLParser") == "html_parser"
        assert camel_to_snake("iOS") == "i_os"
    
    def test_snake_to_camel_simple(self):
        """Test simple snake_case to camelCase conversion."""
        # Act & Assert
        assert snake_to_camel("snake_case") == "snakeCase"
        assert snake_to_camel("simple_test") == "simpleTest"
        assert snake_to_camel("my_variable") == "myVariable"
    
    def test_snake_to_camel_multiple_words(self):
        """Test snake_case with multiple words."""
        # Act & Assert
        assert snake_to_camel("this_is_a_long_variable_name") == "thisIsALongVariableName"
        assert snake_to_camel("user_account_balance") == "userAccountBalance"
        assert snake_to_camel("http_response_code") == "httpResponseCode"
    
    def test_snake_to_camel_with_numbers(self):
        """Test snake_case with numbers."""
        # Act & Assert
        assert snake_to_camel("version_2") == "version2"
        assert snake_to_camel("test_case_1") == "testCase1"
        assert snake_to_camel("api_v2_response") == "apiV2Response"
    
    def test_snake_to_camel_already_camel(self):
        """Test that camelCase input remains unchanged."""
        # Act & Assert
        assert snake_to_camel("alreadyCamelCase") == "alreadyCamelCase"
        assert snake_to_camel("simpleTest") == "simpleTest"
        assert snake_to_camel("multiWordTest") == "multiWordTest"
    
    def test_snake_to_camel_empty_string(self):
        """Test empty string input."""
        # Act & Assert
        assert snake_to_camel("") == ""
    
    def test_snake_to_camel_single_word(self):
        """Test single word input."""
        # Act & Assert
        assert snake_to_camel("word") == "word"
        assert snake_to_camel("Word") == "Word"
    
    def test_snake_to_camel_special_cases(self):
        """Test special cases and edge cases."""
        # Act & Assert
        assert snake_to_camel("xml_http_request") == "xmlHttpRequest"
        assert snake_to_camel("html_parser") == "htmlParser"
        assert snake_to_camel("i_os") == "iOs"
    
    def test_round_trip_conversion(self):
        """Test that camel_to_snake and snake_to_camel are inverse operations."""
        test_cases = [
            "camelCase",
            "thisIsALongVariableName",
            "userAccountBalance",
            "httpResponseCode",
            "version2",
            "testCase1"
        ]
        
        for original in test_cases:
            # Act
            snake_version = camel_to_snake(original)
            camel_version = snake_to_camel(snake_version)
            
            # Assert
            assert camel_version == original, f"Round trip failed for: {original}"
    
    def test_round_trip_snake_to_camel(self):
        """Test that snake_to_camel and camel_to_snake are inverse operations."""
        test_cases = [
            "snake_case",
            "this_is_a_long_variable_name",
            "user_account_balance",
            "http_response_code",
            "version2",  # Note: version_2 becomes version2, not version_2
            "test_case1"  # Note: test_case_1 becomes test_case1
        ]
        
        for original in test_cases:
            # Act
            camel_version = snake_to_camel(original)
            snake_version = camel_to_snake(camel_version)
            
            # Assert
            assert snake_version == original, f"Round trip failed for: {original}"

