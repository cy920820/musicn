import { join } from 'path'
import { unlinkSync } from 'fs'
import { expect, describe, it, beforeEach, afterEach } from 'vitest'
import { pathExists } from 'path-exists'
import { globby } from 'globby'
import { execa } from 'execa'
import Checkbox from 'inquirer/lib/prompts/checkbox'
import ReadlineStub from './helpers/readline'
import search from '../src/search'
import download from '../src/download'
import names from '../src/names'

describe('download', () => {
  beforeEach(async () => {
    this.args = ['my love']
    this.rl = new ReadlineStub()
    const { stdout } = await execa('npx esno src/command', this.args)
    const { searchSongs, options } = await search(JSON.parse(stdout))
    this.checkbox = new Checkbox(
      {
        name: 'songs',
        message: '选择歌曲',
        choices: searchSongs.map((song, index) => names(song, index, options)),
      },
      this.rl,
      ''
    )
  })
  afterEach(async () => {
    const paths = await globby('./**/*.{flac,mp3,lrc}')
    for (const p of paths) {
      unlinkSync(p)
    }
  })

  const downloadSingleSong = async () => {
    const promise = this.checkbox.run()
    this.rl.input.emit('keypress', ' ', { name: 'space' })
    this.rl.emit('line')
    const answer = await promise
    const { songName } = answer[0]
    expect(answer.length).toEqual(1)
    await download(answer)
    expect(pathExists(join(process.cwd(), songName))).toBeTruthy()
  }

  const downloadTwoSongs = async () => {
    const promise = this.checkbox.run()
    this.rl.input.emit('keypress', null, { name: 'down' })
    this.rl.input.emit('keypress', ' ', { name: 'space' })
    this.rl.input.emit('keypress', null, { name: 'down' })
    this.rl.input.emit('keypress', ' ', { name: 'space' })
    this.rl.emit('line')
    const answer = await promise
    const { songName: name1 } = answer[0]
    const { songName: name2 } = answer[1]
    expect(answer.length).toEqual(2)
    await download(answer)
    expect(pathExists(join(process.cwd(), name1))).toBeTruthy()
    expect(pathExists(join(process.cwd(), name2))).toBeTruthy()
  }

  const downloadSingleSongInNewDir = async () => {
    const promise = this.checkbox.run()
    this.rl.input.emit('keypress', ' ', { name: 'space' })
    this.rl.emit('line')
    const answer = await promise
    const {
      songName,
      options: { path: destDir },
    } = answer[0]
    expect(answer.length).toEqual(1)
    await download(answer)
    expect(pathExists(join(destDir, songName))).toBeTruthy()
  }

  const downloadSingleSongWithLyric = async () => {
    const promise = this.checkbox.run()
    this.rl.input.emit('keypress', ' ', { name: 'space' })
    this.rl.emit('line')
    const answer = await promise
    const { songName } = answer[0]
    const lrcName = `${songName.split('.')[0]}.lrc`
    expect(answer.length).toEqual(1)
    await download(answer)
    expect(pathExists(join(process.cwd(), songName))).toBeTruthy()
    expect(pathExists(join(process.cwd(), lrcName))).toBeTruthy()
  }

  it('should download a single song from the default page 1 of the migu service', async () => {
    await downloadSingleSong()
  })

  it('should download two songs from the default page 1 of the migu service', async () => {
    await downloadTwoSongs()
    this.args = ['my love -n 2']
  })

  it('should download a single song from the page 2 of the migu service', async () => {
    await downloadSingleSong()
    this.args = ['my love -n 3 -p ./test']
  })

  it('should download a single song in a new dir of the migu service', async () => {
    await downloadSingleSongInNewDir
    this.args = ['my love -n 4 -l']
  })

  it('should download a single song with lyric of the migu service', async () => {
    await downloadSingleSongWithLyric()
  })
})
