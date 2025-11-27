"""
Script to list available Gemini models
Run this to see which models you can use with your API key
"""
import os
import google.generativeai as genai

# Get API key from environment
api_key = os.environ.get("GOOGLE_API_KEY")

if not api_key:
    print("❌ GOOGLE_API_KEY not found in environment variables")
    print("Please set it using: set GOOGLE_API_KEY=your_api_key_here")
    raise SystemExit(1)

try:
    genai.configure(api_key=api_key)
    
    print("\n✅ Connected to Google AI API")
    print("\n📋 Available Models:\n")
    print("-" * 80)
    
    for model in genai.list_models():
        # Check if model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            print(f"✓ {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description[:100]}...")
            print(f"  Supported methods: {', '.join(model.supported_generation_methods)}")
            print("-" * 80)
    
    print("\n💡 Recommended models for chat:")
    print("   🚀 models/gemini-flash-latest - Latest stable version (RECOMMENDED)")
    print("   ⚡ models/gemini-2.5-flash - Stable Gemini 2.5 (Fast, 1M tokens)")
    print("   💎 models/gemini-2.5-pro - Most capable Gemini 2.5")
    print("   🔥 models/gemini-2.0-flash - Gemini 2.0 stable version")
    print("   🌟 models/gemini-pro-latest - Latest Pro version")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nPlease check:")
    print("  1. Your API key is valid")
    print("  2. You have internet connection")
    print("  3. The Google AI API is accessible from your location")


