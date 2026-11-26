# Product photo guide

## What to supply
| Item | Requirement |
|---|---|
| Shape | Square, preferably 2400 x 2400 px. At least 1600 px on the short side. |
| Format | JPEG at high quality, PNG or TIFF. sRGB colour. Send originals, not WhatsApp copies. |
| Name | The product name from the list below, for example `bonfortis-k2.jpg` |
| Framing | One pack, centred, upright, filling about 80% of the height, with the same angle and lighting for every product |

## Depth of field
Blur the **background only**. The whole front label must be sharp from edge to edge,
including small text and the curved sides that face the camera. Too shallow a depth of
field makes the label unreadable, which is the opposite of a clearer image.

## The label must be real
The photo must match the pack the customer receives: same artwork, pack count, flavour
and wording. If a photo is generated or retouched, compare every word on the label with
the approved artwork. Claims printed in a photo are product claims too, so do the claim
review (`compliance/product-claim-review.md`) before finalising photos.

## Product file names
bonfortis-k2, charcoal-pro, cordyvital, dailyvit, green-good, healogen, herbagut,
herbasome, menmaxx, momvit, omegasea, optimeal-maxx, optimeal-pro, orthoflex-pro,
power-fresh-plus, primmune-pro, sadnil, shredd-360, sleep-support, stressnil, vita-dk7

## Import
```bash
npm run images:import -- /path/to/your/photos
```
You can import a few at a time. Each photo replaces the one with the same name.
Camera details, including location, are removed. Keep your originals somewhere safe.
