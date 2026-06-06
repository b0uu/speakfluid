# Speakfluid v2 todo in order of priority

## 0. Get current diagnostic
Run tests on current Speakfluid MVP to get a basis for future improvement

## 1. Add backend proxy
Add backend proxy instead of direct calls from browser in order to improve tracking of logs, latency, model choice, scheme fails, etc. Have server call openai/elevenlabs instead of client

## 2. LLM structured json output & validation w/ Zod
Instead of prompting LLM to return text in a specific textual format and then using our parser function, we instead need to have structured JSON output from LLM that details everything we need to know (response type, speech segments btwn english and spanish, etc.) and validate with Zod. This will make eval implementation a lot easier, and set up stage to implement bilingual TTS correctly this time. ALso overall just more of a consistent format.

## 3. Develop eval pipeline
Should crtically evaluate response quality based on my vision of making the tutor directing, informative, and natural-flowing. This eval pipeline will be crucial to tuning our prompts and LLM workflows to make the flow a truly seamless language tutoring experience. Ideally make the pipeline simple to start and go from there.

## 4. Fully implement mixed language STT/TTS
- For mixed language TTS need to remove hardcoded spanish tag and take advantage of new segment system with the structured json output. Also utilize eleven labs hints to avoid choppy tones between language segments, do a lot of tests
- For mixed language STT need to remove the hardcoded spanish tag as well, that is currently active and run tests to determine whether model can interpret well.
- Add cases for both STT and TTS to eval pipeline
- Should only utilize mixed language TTS when necessary, for v2 probably just implement for tutor corrections and tutor clarifying follow-ups (if user clearly doesn't understand what the tutor is saying).

## 5. Run model comparisons using our eval pipeline
- Test on various models, be open minded

## 6. Track key usage metrics
Track metrics such as 
- STT latency
- TTS latency
- Tutor latency

## 7. Update README, update spec
compare v2 diagnostic with MVP diagnostic to quantitatively gauge progress

