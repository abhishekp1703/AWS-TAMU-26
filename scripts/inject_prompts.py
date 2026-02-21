#!/usr/bin/env python3
"""
Script to inject prompts from prompts/all_prompts.py into lambda_pipeline/lambda_function.py
"""
import re
import sys
from pathlib import Path

# Get project root
project_root = Path(__file__).parent.parent
prompts_file = project_root / 'prompts' / 'all_prompts.py'
lambda_file = project_root / 'backend' / 'lambda_pipeline' / 'lambda_function.py'

def extract_prompts():
    """Extract prompt constants from prompts/all_prompts.py"""
    if not prompts_file.exists():
        print(f"❌ Error: {prompts_file} not found")
        sys.exit(1)
    
    with open(prompts_file, 'r') as f:
        content = f.read()
    
    prompts = {}
    prompt_names = ['SYNTHESIS_PROMPT', 'TEXAS_PROMPT', 'QUESTIONS_PROMPT', 
                   'GAPS_PROMPT', 'ASSEMBLY_PROMPT', 'SCHEMA_PROMPT']
    
    for prompt_name in prompt_names:
        # Match triple-quoted strings
        pattern = rf'{prompt_name}\s*=\s*"""(.*?)"""'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            prompts[prompt_name] = match.group(1)
        else:
            print(f"⚠️  Warning: {prompt_name} not found in {prompts_file}")
    
    return prompts

def inject_prompts(prompts):
    """Inject prompts into lambda_function.py"""
    if not lambda_file.exists():
        print(f"❌ Error: {lambda_file} not found")
        sys.exit(1)
    
    with open(lambda_file, 'r') as f:
        content = f.read()
    
    # Replace each prompt placeholder
    for prompt_name, prompt_value in prompts.items():
        # Find the placeholder line
        placeholder_pattern = rf'({prompt_name}\s*=\s*)""".*?"""'
        replacement = f'{prompt_name} = """{prompt_value}"""'
        
        if re.search(placeholder_pattern, content, re.DOTALL):
            content = re.sub(placeholder_pattern, replacement, content, flags=re.DOTALL)
            print(f"✅ Injected {prompt_name}")
        else:
            # Try to find and replace placeholder text
            placeholder_text_pattern = rf'({prompt_name}\s*=\s*)""".*?\[PASTE.*?\]"""'
            if re.search(placeholder_text_pattern, content, re.DOTALL):
                content = re.sub(placeholder_text_pattern, replacement, content, flags=re.DOTALL)
                print(f"✅ Injected {prompt_name} (replaced placeholder)")
            else:
                print(f"⚠️  Warning: Could not find placeholder for {prompt_name}")
    
    # Write back
    with open(lambda_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Prompts injected into {lambda_file}")

def main():
    print("🔧 Injecting prompts into Lambda pipeline function...")
    prompts = extract_prompts()
    
    if not prompts:
        print("❌ No prompts found. Exiting.")
        sys.exit(1)
    
    inject_prompts(prompts)
    print("✅ Done!")

if __name__ == '__main__':
    main()
