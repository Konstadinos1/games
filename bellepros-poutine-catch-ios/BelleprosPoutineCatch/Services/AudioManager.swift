import AVFoundation

/// Procedural sound effects — a tiny tone synthesizer, mirroring the web build's
/// WebAudio oscillator SFX (no audio asset files needed). Thread-safe: the audio
/// render thread reads `active` under a lock while the main thread queues notes.
final class AudioManager {

    static let shared = AudioManager()

    enum SFX { case click, catchGood, miss, soggy, reward, gameOver, tick, whoosh }
    enum Wave { case sine, square, triangle, saw }

    /// Muting clears anything currently sounding.
    var isMuted = false {
        didSet { lock.lock(); if isMuted { active.removeAll() }; lock.unlock() }
    }

    private let engine = AVAudioEngine()
    private let sampleRate: Double = 44_100
    private var active: [Voice] = []
    private let lock = NSLock()

    private init() { setup() }

    // MARK: - Public API

    func play(_ sound: SFX, combo: Int = 0) {
        guard !isMuted, engine.isRunning else { return }
        switch sound {
        case .click:    add(Voice(freqStart: 420, freqEnd: 360, wave: .square,   dur: 0.05, gain: 0.16))
        case .catchGood:
            let f = 520 + Double(min(combo, 8)) * 26          // pitch rises with the combo
            add(Voice(freqStart: f, freqEnd: f * 1.5, wave: .triangle, dur: 0.10, gain: 0.20))
        case .miss:     add(Voice(freqStart: 300, freqEnd: 150, wave: .sine,     dur: 0.16, gain: 0.18))
        case .soggy:    add(Voice(freqStart: 230, freqEnd: 80,  wave: .saw,      dur: 0.22, gain: 0.18))
        case .reward:   arpeggio([523, 659, 784, 1047], wave: .triangle, step: 0.09, gain: 0.20)
        case .gameOver: arpeggio([392, 330, 262, 196],  wave: .square,   step: 0.13, gain: 0.18)
        case .tick:     add(Voice(freqStart: 880, freqEnd: 880, wave: .square,   dur: 0.04, gain: 0.14))
        case .whoosh:   add(Voice(freqStart: 200, freqEnd: 900, wave: .sine,     dur: 0.18, gain: 0.12))
        }
    }

    // MARK: - Engine

    private func setup() {
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
        let source = AVAudioSourceNode { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
            guard let self else { return noErr }
            let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
            let out = buffers[0].mData!.assumingMemoryBound(to: Float.self)
            self.lock.lock()
            for frame in 0..<Int(frameCount) {
                var sample = 0.0
                for i in self.active.indices { sample += self.active[i].render(self.sampleRate) }
                out[frame] = Float(max(-1, min(1, sample)))
            }
            self.active.removeAll { $0.finished }
            self.lock.unlock()
            return noErr
        }
        engine.attach(source)
        engine.connect(source, to: engine.mainMixerNode, format: format)
        // Mix with other audio, duck nothing — it's a casual game.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        try? engine.start()
    }

    private func add(_ voice: Voice) { lock.lock(); active.append(voice); lock.unlock() }

    private func arpeggio(_ freqs: [Double], wave: Wave, step: Double, gain: Double) {
        for (i, f) in freqs.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + step * Double(i)) { [weak self] in
                self?.add(Voice(freqStart: f, freqEnd: f, wave: wave, dur: step * 1.4, gain: gain))
            }
        }
    }

    // MARK: - Voice (one sounding note with a glide + AD envelope)

    private struct Voice {
        var phase = 0.0
        var elapsed = 0.0
        let freqStart: Double
        let freqEnd: Double
        let wave: Wave
        let dur: Double
        let gain: Double

        var finished: Bool { elapsed >= dur }

        mutating func render(_ sr: Double) -> Double {
            let frac = elapsed / dur
            let freq = freqStart + (freqEnd - freqStart) * frac
            phase += 2 * .pi * freq / sr
            if phase > 2 * .pi { phase -= 2 * .pi }
            let raw: Double
            switch wave {
            case .sine:     raw = sin(phase)
            case .square:   raw = sin(phase) >= 0 ? 1 : -1
            case .triangle: raw = 2 / .pi * asin(sin(phase))
            case .saw:      raw = 2 * (phase / (2 * .pi)) - 1
            }
            // quick attack, linear decay to silence
            let attack = frac < 0.02 ? frac / 0.02 : 1
            let env = max(0, 1 - frac) * attack
            elapsed += 1 / sr
            return raw * gain * env
        }
    }
}
