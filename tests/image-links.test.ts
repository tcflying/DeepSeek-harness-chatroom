import { expect, it } from 'vitest'
import { projectImageLinks } from '../src/client/image-links.js'
const id = '15e22360-f266-4fab-8d0f-d5821cd1b786'
const url = '/plugins/deepseek-harness-chatroom/api/files/' + id
it('recovers the observed broken marker without inventing file metadata', () => {
  const malformed = encodeURIComponent(`{"id":"${id}","mediaType""image/png","bytes":3398288}`)
  const result = projectImageLinks(`水墨画\n![水墨擎天柱](${url})\n\u2063dsh-chatroom-file:${malformed}\u2063文件：generated.png\n已完成`, [])
  expect(result.images).toEqual([{ url, alt: '水墨擎天柱' }])
  expect(result.text).toBe('水墨画\n\n\n已完成')
})
it('does not interpret untrusted remote/file/script links or hide unmatched malformed markers', () => {
  for (const link of ['https://evil.test/image.png', '//evil.test/file', 'javascript:alert(1)', 'file:///private.png']) {
    const text = `![x](${link})`
    expect(projectImageLinks(text, [])).toEqual({ text, images: [] })
  }
  const text = '\u2063dsh-chatroom-file:broken\u2063'
  expect(projectImageLinks(text, []).text).toBe(text)
})
it('deduplicates marker-backed previews and repeated same-file links', () => {
  const text = `![one](${url}) ![two](${url})`
  expect(projectImageLinks(text, []).images).toHaveLength(1)
  expect(projectImageLinks(text, [{ id, name: 'image.png', mediaType: 'image/png', bytes: 42 }]).images).toEqual([])
})
