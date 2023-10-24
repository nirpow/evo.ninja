import { BaseDocumentMetadata, LocalDocument } from "../embeddings";
import { LazyArray } from "../utils/LazyArray";

export class TextRecombiner {
  static surroundingText(
    surroundingCharacters: number, 
    overlap?: number, 
  ): <TMetadata extends BaseDocumentMetadata>(results: LazyArray<{item: string, doc: LocalDocument<TMetadata> }>, originalItems: string[]) => LazyArray<string> {
    const halfSurroundChars = Math.floor(surroundingCharacters / 2);
    
    return <TMetadata extends BaseDocumentMetadata>(results: LazyArray<{item: string, doc: LocalDocument<TMetadata> }>, originalItems: string[]): LazyArray<string> => {
      const promise = results.then(results => {
        const docs = results.map(x => x.doc);
  
        const surroundedResults = docs.map(result => {
          const resultIndex = result.metadata()!.index;
    
          const textBehind = getTextFromPriorChunks({
            originalItems,
            currentIndex: resultIndex,
            overlap: overlap ?? 0,
            characterLimit: halfSurroundChars,
          })
    
          const textForward = getTextFromNextChunks({
            originalItems,
            currentIndex: resultIndex,
            overlap: overlap ?? 0,
            characterLimit: halfSurroundChars,
          })
    
          const withSurrounding = [textBehind, result.text(), textForward].join("")

          return {
            match: result,
            withSurrounding
          };
        })
    
        return surroundedResults.map(x => x.withSurrounding);
      });
  
      return new LazyArray(promise);
    };
  }
}

export const getTextFromPriorChunks = (args: { originalItems: string[], currentIndex: number, overlap: number, characterLimit: number }) => {
  const { originalItems, currentIndex, overlap, characterLimit } = args
  
  let textBehind = ""

  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevResult = originalItems[i]

    if (!prevResult || textBehind.length > characterLimit) {
      return textBehind
    }

    const prevResultText = overlap ? prevResult.slice(0, -overlap) : prevResult;

    if (prevResultText.length + textBehind.length <= characterLimit) {
      textBehind = prevResultText + textBehind
    } else {
      const charactersLeft = characterLimit - textBehind.length
      const prevResultPiece = prevResultText.slice(-charactersLeft)
      textBehind = prevResultPiece + textBehind
    }
  }

  return textBehind
}

export const getTextFromNextChunks = (args: { originalItems: string[], currentIndex: number, overlap: number, characterLimit: number}) => {
  const { originalItems, currentIndex, overlap, characterLimit } = args
  
  let textForward = ""

  for (let i = currentIndex + 1; i <= originalItems.length; i++) {
    const nextResult = originalItems[i]

    if (!nextResult || textForward.length > characterLimit) {
      return textForward
    }

    const nextResultText = overlap ? nextResult.slice(overlap) : nextResult;

    if (nextResultText.length + textForward.length <= characterLimit) {
      textForward = textForward + nextResultText
    } else {
      const charactersLeft = characterLimit - textForward.length
      const nextResultPiece = nextResultText.slice(-charactersLeft)
      textForward = textForward + nextResultPiece
    }
  }

  return textForward;
}