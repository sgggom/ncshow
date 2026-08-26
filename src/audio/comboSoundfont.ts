export interface ComboInstrument {
  id: string;
  name: string;
  soundfont: string;
}

export interface ComboInstrumentCategory {
  name: string;
  instruments: readonly ComboInstrument[];
}

const category = (name: string, instruments: readonly [string, string, string][]): ComboInstrumentCategory => ({
  name,
  instruments: instruments.map(([id, instrumentName, soundfont]) => ({ id, name: instrumentName, soundfont })),
});

// FluidR3_GM uses the General MIDI catalog. Keeping the catalog here makes the
// picker independent from the audio implementation and easy to extend.
export const COMBO_INSTRUMENT_CATEGORIES: readonly ComboInstrumentCategory[] = [
  category('钢琴', [
    ['piano', '三角钢琴', 'acoustic_grand_piano'], ['bright', '明亮钢琴', 'bright_acoustic_piano'],
    ['epiano1', '电钢琴', 'electric_piano_1'], ['epiano2', '电钢琴 2', 'electric_piano_2'],
    ['honky', '酒吧钢琴', 'honkytonk_piano'], ['harpsi', '羽管键琴', 'harpsichord'], ['clav', '古钢琴', 'clavinet'],
  ]),
  category('打击／键盘', [
    ['celesta', '钢片琴', 'celesta'], ['glock', '钟琴', 'glockenspiel'], ['musicbox', '八音盒', 'music_box'],
    ['vibes', '颤音琴', 'vibraphone'], ['marimba', '马林巴', 'marimba'], ['xylo', '木琴', 'xylophone'],
    ['tubular', '管钟', 'tubular_bells'], ['dulcimer', '洋琴', 'dulcimer'],
  ]),
  category('风琴', [
    ['organ1', '拉杆风琴', 'drawbar_organ'], ['organ2', '打击风琴', 'percussive_organ'],
    ['organ3', '摇滚风琴', 'rock_organ'], ['organ4', '教堂管风琴', 'church_organ'],
    ['organ5', '簧风琴', 'reed_organ'], ['accordion', '手风琴', 'accordion'],
    ['harmonica', '口琴', 'harmonica'], ['bandoneon', '班多钮', 'tango_accordion'],
  ]),
  category('吉他', [
    ['nylon', '尼龙弦吉他', 'acoustic_guitar_nylon'], ['steel', '钢弦吉他', 'acoustic_guitar_steel'],
    ['jazz', '爵士吉他', 'electric_guitar_jazz'], ['clean', '清音电吉他', 'electric_guitar_clean'],
    ['muted', '闷音电吉他', 'electric_guitar_muted'], ['overdrive', '过载吉他', 'overdriven_guitar'],
    ['dist', '失真吉他', 'distortion_guitar'], ['gtrharm', '泛音吉他', 'guitar_harmonics'],
  ]),
  category('弦乐', [
    ['violin', '小提琴', 'violin'], ['viola', '中提琴', 'viola'], ['cello', '大提琴', 'cello'],
    ['tremolo', '颤音弦乐', 'tremolo_strings'], ['pizz', '拨弦合奏', 'pizzicato_strings'],
    ['harp', '竖琴', 'orchestral_harp'], ['timpani', '定音鼓', 'timpani'],
  ]),
  category('合奏／人声', [
    ['strsect1', '弦乐合奏', 'string_ensemble_1'], ['strsect2', '弦乐合奏 2', 'string_ensemble_2'],
    ['choir', '人声合唱', 'choir_aahs'], ['voice', '人声“哦”', 'voice_oohs'],
    ['synvoice', '合成人声', 'synth_choir'], ['orchhit', '交响强音', 'orchestra_hit'],
  ]),
  category('铜管', [
    ['trumpet', '小号', 'trumpet'], ['trombone', '长号', 'trombone'], ['tuba', '大号', 'tuba'],
    ['mutetrp', '闷音小号', 'muted_trumpet'], ['frhorn', '圆号', 'french_horn'],
    ['brsect', '铜管合奏', 'brass_section'], ['synbrs1', '合成铜管', 'synth_brass_1'],
  ]),
  category('木管／笛', [
    ['soprano', '高音萨克斯', 'soprano_sax'], ['alto', '中音萨克斯', 'alto_sax'],
    ['tenor', '次中音萨克斯', 'tenor_sax'], ['oboe', '双簧管', 'oboe'], ['clarinet', '单簧管', 'clarinet'],
    ['flute', '长笛', 'flute'], ['piccolo', '短笛', 'piccolo'], ['recorder', '竖笛', 'recorder'],
    ['panflute', '排箫', 'pan_flute'], ['shakuhachi', '尺八', 'shakuhachi'], ['ocarina', '陶笛', 'ocarina'],
  ]),
  category('合成器', [
    ['lead1', '方波 Lead', 'lead_1_square'], ['lead2', '锯齿波 Lead', 'lead_2_sawtooth'],
    ['lead3', '汽笛 Lead', 'lead_3_calliope'], ['lead6', '人声 Lead', 'lead_6_voice'],
    ['pad1', '新世纪 Pad', 'pad_1_new_age'], ['pad2', '温暖 Pad', 'pad_2_warm'],
    ['pad4', '合唱 Pad', 'pad_4_choir'], ['pad7', '氛围 Pad', 'pad_7_halo'], ['fx3', '水晶', 'fx_3_crystal'],
  ]),
  category('民族乐器', [
    ['sitar', '西塔琴', 'sitar'], ['banjo', '班卓琴', 'banjo'], ['shamisen', '三味线', 'shamisen'],
    ['koto', '日本筝', 'koto'], ['kalimba', '卡林巴', 'kalimba'], ['bagpipe', '风笛', 'bagpipe'],
    ['fiddle', '民谣小提琴', 'fiddle'], ['shanai', '唂呐', 'shanai'],
  ]),
] as const;

export const COMBO_INSTRUMENTS = COMBO_INSTRUMENT_CATEGORIES.flatMap(({ instruments }) => instruments);
export const DEFAULT_COMBO_INSTRUMENT_ID = 'piano';

export const AVAILABLE_COMBO_INSTRUMENT_IDS = [
  'piano', 'bright', 'epiano1', 'epiano2', 'honky', 'clav',
  'celesta', 'musicbox', 'vibes', 'marimba', 'xylo',
  'nylon', 'steel', 'clean', 'muted', 'harp', 'pizz',
  'fx3', 'sitar', 'banjo', 'kalimba',
] as const;

const availableComboInstrumentIds = new Set<string>(AVAILABLE_COMBO_INSTRUMENT_IDS);

export const isComboInstrumentId = (value: unknown): value is string => (
  typeof value === 'string' && COMBO_INSTRUMENTS.some(({ id }) => id === value)
);

export const isAvailableComboInstrumentId = (value: unknown): value is string => (
  typeof value === 'string' && availableComboInstrumentIds.has(value)
);

const COMBO_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'] as const;
const REMOTE_SOUNDFONT_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM';

// Group loudness measured across the 11 shipped notes with FFmpeg EBU R128.
// Values target -34 LUFS and preserve the relative dynamics within each instrument.
const COMBO_INSTRUMENT_GAIN_DB: Readonly<Record<string, number>> = {
  piano: 1.7,
  bright: 2.1,
  epiano1: -5.1,
  epiano2: 0.7,
  honky: 2.4,
  clav: 0,
  celesta: -2.2,
  musicbox: -2.7,
  vibes: 2.4,
  marimba: -3.6,
  xylo: 5.1,
  nylon: 0,
  steel: -0.1,
  clean: -1.2,
  muted: 2.7,
  harp: -0.6,
  pizz: -3.9,
  fx3: 2,
  sitar: 1.9,
  banjo: -1.4,
  kalimba: 1.1,
};

class ComboSoundfontPlayer {
  private context?: AudioContext;
  private instrumentId = DEFAULT_COMBO_INSTRUMENT_ID;
  private activeInstrumentId = DEFAULT_COMBO_INSTRUMENT_ID;
  private randomEnabled = false;
  private randomBag: string[] = [];
  private lastRandomInstrumentId?: string;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly activeSources = new Set<AudioBufferSourceNode>();

  public setInstrument(instrumentId: string): void {
    if (!isComboInstrumentId(instrumentId)) return;
    this.instrumentId = instrumentId;
    if (!this.randomEnabled) this.activeInstrumentId = instrumentId;
    void this.preload(instrumentId);
  }

  public setRandomEnabled(enabled: boolean): void {
    if (this.randomEnabled === enabled) return;
    this.randomEnabled = enabled;
    if (enabled) {
      this.advanceRandomInstrument();
    } else {
      this.activeInstrumentId = this.instrumentId;
      void this.preload(this.instrumentId);
    }
  }

  public advanceRandomInstrument(): void {
    if (!this.randomEnabled) return;
    if (this.randomBag.length === 0) this.refillRandomBag();
    const next = this.randomBag.pop() ?? DEFAULT_COMBO_INSTRUMENT_ID;
    this.activeInstrumentId = next;
    this.lastRandomInstrumentId = next;
    void this.preload(next);
  }

  public async preload(instrumentId = this.activeInstrumentId): Promise<void> {
    await Promise.allSettled(COMBO_NOTES.map((note) => this.loadBuffer(instrumentId, note)));
  }

  public async play(level: number, volume = 0.72): Promise<void> {
    const note = COMBO_NOTES[Math.max(0, Math.min(COMBO_NOTES.length - 1, Math.floor(level) - 1))];
    if (!note) return;
    const instrumentId = this.activeInstrumentId;
    try {
      const context = this.getContext();
      if (context.state === 'suspended') await context.resume();
      const buffer = await this.loadBuffer(instrumentId, note);
      if (instrumentId !== this.activeInstrumentId) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      const calibrationDb = COMBO_INSTRUMENT_GAIN_DB[instrumentId] ?? 0;
      gain.gain.value = volume * 10 ** (calibrationDb / 20);
      source.connect(gain).connect(context.destination);
      this.activeSources.add(source);
      source.addEventListener('ended', () => this.activeSources.delete(source), { once: true });
      source.start();
    } catch (error) {
      console.warn('Unable to play SoundFont combo note.', error);
    }
  }

  public stopAll(): void {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch { /* The source may have already ended. */ }
    });
    this.activeSources.clear();
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext();
    return this.context;
  }

  private refillRandomBag(): void {
    const bag = [...AVAILABLE_COMBO_INSTRUMENT_IDS];
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === this.lastRandomInstrumentId) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    this.randomBag = bag;
  }

  private loadBuffer(instrumentId: string, note: string): Promise<AudioBuffer> {
    const instrument = COMBO_INSTRUMENTS.find(({ id }) => id === instrumentId)
      ?? COMBO_INSTRUMENTS[0];
    const key = `${instrument.id}:${note}`;
    const cached = this.buffers.get(key);
    if (cached) return cached;
    const baseUrl = isAvailableComboInstrumentId(instrument.id)
      ? `./audio/instruments/${instrument.soundfont}`
      : `${REMOTE_SOUNDFONT_BASE}/${instrument.soundfont}-mp3`;
    const request = fetch(`${baseUrl}/${note}.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error(`SoundFont request failed (${response.status})`);
        return response.arrayBuffer();
      })
      .then((data) => this.getContext().decodeAudioData(data));
    this.buffers.set(key, request);
    request.catch(() => this.buffers.delete(key));
    return request;
  }
}

export const comboSoundfontPlayer = new ComboSoundfontPlayer();
