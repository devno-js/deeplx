import {
  abbreviateLanguage,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_ERROR,
  HTTP_STATUS_NOT_ALLOWED,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  type SourceLanguage,
  type TargetLanguage,
  translate as translate_,
} from 'npm:@deeplx/core'

export interface RequestBody {
  text: string
  source_lang?: SourceLanguage
  target_lang: TargetLanguage
}

async function extractBodyText(body: ReadableStream) {
  const reader = body.getReader()
  const decoder = new TextDecoder()

  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      return text
    }
    text += decoder.decode(value)
  }
}

export const translate = async (
  req: Request,
): Promise<Response> => {
  let url = new URL(req.url).pathname

  if (!url || url === '/') {
    url = '/index.html'
  }

  if (/\.[a-z]+[a-z\d]*$/.test(url)) {
    if (req.method !== 'GET') {
      return Response.json({
        code: HTTP_STATUS_NOT_ALLOWED,
        message: 'Not Allowed',
      }, { status: HTTP_STATUS_NOT_ALLOWED })
    }
    return new Response(await Deno.readFile(`./public${url}`))
  }

  if (url !== '/translate') {
    if (req.method !== 'GET') {
      return Response.json({
        code: HTTP_STATUS_NOT_FOUND,
        message: 'Not Found',
      }, { status: HTTP_STATUS_NOT_FOUND })
    }
    return new Response(`Not Found`, {
      status: HTTP_STATUS_NOT_FOUND,
    })
  }

  const body = req.body

  if (!body || req.method !== 'POST') {
    return new Response(`DeepL Translate Api

POST {"text": "have a try", "source_lang": "auto", "target_lang": "ZH"} to /translate

https://github.com/devno-js/deeplx

powered by https://github.com/un-ts/deeplx`)
  }

  const bodyText = await extractBodyText(body)

  const { text, source_lang: sourceLang, target_lang: targetLang } = JSON.parse(
    bodyText,
  ) as RequestBody

  if (!text) {
    return Response.json({
      code: HTTP_STATUS_BAD_REQUEST,
      data: 'Text is required',
    }, {
      status: HTTP_STATUS_BAD_REQUEST,
    })
  }

  if (!abbreviateLanguage(targetLang)) {
    return Response.json({
      code: HTTP_STATUS_BAD_REQUEST,
      data: 'Invalid target language',
    }, {
      status: HTTP_STATUS_BAD_REQUEST,
    })
  }

  try {
    const translation = await translate_(text, targetLang, sourceLang)
    return Response.json({
      code: HTTP_STATUS_OK,
      data: translation,
    })
  } catch (err) {
    return Response.json({
      code: HTTP_STATUS_INTERNAL_ERROR,
      data: err instanceof Error ? err.message : String(err),
    }, {
      status: HTTP_STATUS_INTERNAL_ERROR,
    })
  }
}
