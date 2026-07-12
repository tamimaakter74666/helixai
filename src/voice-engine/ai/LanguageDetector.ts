export class LanguageDetector {
  detect(text: string): string {
    const banglaPattern = /[\u0980-\u09FF]/;
    if (banglaPattern.test(text)) {
      return 'bn-BD';
    }
    return 'en-US';
  }
}
