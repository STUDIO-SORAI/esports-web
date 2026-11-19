import type { PetitionLanguage } from '../../lib/petition'
import { en } from './en'
import { ja } from './ja'
import type { LetterContent } from './types'
import { vi } from './vi'
import { zh } from './zh'

export type {
  LetterChangelog,
  LetterChangelogEntry,
  LetterContent,
  LetterDemand,
  LetterParagraph,
  LetterSource,
  LetterTldr,
  LetterUi,
} from './types'
export { PETITION_LANGUAGE_OPTIONS } from './types'

export const OPEN_LETTER: Record<PetitionLanguage, LetterContent> = {
  zh,
  en,
  vi,
  ja,
}
