# Attribution

## Adapted local skills

Repository-specific adaptations are maintained and authored in this repository
by André Vandal. Original upstream authors retain their notices below.

The following skills derive from [Matt Pocock's skills](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7),
pinned at `c55ee46073ed923f86ce59a5eb3b6d895095d1b7` under MIT:

| Local skill       | Upstream path                        | Adaptation                                                                              |
| ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| `grilling`        | `skills/productivity/grilling`       | Interview rounds with plain-text formatting                                             |
| `grill-with-docs` | `skills/engineering/grill-with-docs` | Harness-neutral invocation and repository documentation flow                            |
| `domain-glossary` | `skills/engineering/domain-modeling` | Renamed locally; root glossary and local ADR format                                     |
| `pr`              | `skills/in-progress/pr`              | Repository PR template, actual verification evidence and local contribution conventions |

`pr` also carries visualization guidance from Dex Horthy's
[show-me skill for HumanLayer](https://github.com/humanlayer/skills/blob/653b6411c1f70c275a18e37673b042ff99f67ceb/plugins/show-me/skills/show-me/SKILL.md),
pinned at `653b6411c1f70c275a18e37673b042ff99f67ceb` under MIT.
Its local [credits](.agents/skills/pr/CREDITS.md) preserve that provenance.

`creating-website`, including its port-existing-site guidance, is locally
authored. It is not a vendored upstream skill.

## Optional registry skills

These are recorded in `skills-lock.json`, installed on request and not vendored.
The repository's MIT license does not relicense their upstream text.

| Skills                                                     | Source and pinned ref                                                                                                                                                 | Upstream terms                                                                                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `code-review`, `codebase-design`, `diagnosing-bugs`, `tdd` | [mattpocock/skills](https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7) at `c55ee46073ed923f86ce59a5eb3b6d895095d1b7`                 | [MIT, Copyright (c) 2026 Matt Pocock](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/LICENSE)              |
| `moon`, `proto`                                            | [hyperb1iss/moonrepo-skill](https://github.com/hyperb1iss/moonrepo-skill/tree/574052bd06a265d472461513c9365264334082b4) at `574052bd06a265d472461513c9365264334082b4` | [Apache-2.0, Copyright 2025 Stefanie Jane](https://github.com/hyperb1iss/moonrepo-skill/blob/574052bd06a265d472461513c9365264334082b4/LICENSE) |
| `debug-task`                                               | [moonrepo/moon](https://github.com/moonrepo/moon/tree/7c3b6f3a834ab8effe482521033d53c19f923a14) at `7c3b6f3a834ab8effe482521033d53c19f923a14`                         | [MIT, Copyright (c) 2021 moonrepo, Inc.](https://github.com/moonrepo/moon/blob/7c3b6f3a834ab8effe482521033d53c19f923a14/LICENSE)               |

Installation and subsequent redistribution must retain the upstream license and
notice requirements. Optional installation is not permission to commit those
files or to label all registry content MIT.

## Matt Pocock MIT notice

The following text is retained from the pinned upstream
[LICENSE](https://github.com/mattpocock/skills/blob/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/LICENSE)
for the adapted local skills.

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## HumanLayer MIT notice

The following text is retained from the pinned upstream
[LICENSE](https://github.com/humanlayer/skills/blob/653b6411c1f70c275a18e37673b042ff99f67ceb/LICENSE)
for the adapted `show-me` guidance in `pr`.

```text
MIT License

Copyright (c) 2026 HumanLayer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
