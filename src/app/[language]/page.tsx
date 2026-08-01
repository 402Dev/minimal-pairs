import LanguageSession from "@/components/LanguageSession";
import { decodeLanguage } from "@/lib/language";
import { getPromptsForLanguage } from "@/lib/prompts";

interface PageProps {
  params: Promise<{ language: string }>;
}

export default async function LanguageRecorderPage({ params }: PageProps) {
  const { language } = await params;
  const decodedLanguage = decodeLanguage(language);
  const { language: canonicalLanguage, prompts } = await getPromptsForLanguage(decodedLanguage);

  return <LanguageSession language={canonicalLanguage} prompts={prompts} />;
}
