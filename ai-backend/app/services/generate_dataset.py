import pandas as pd
import random

data = []

for _ in range(1000):
    knee = random.randint(120, 180)
    hip = random.randint(130, 180)
    back = random.randint(140, 180)
    fatigue = random.randint(0, 100)
    recovery = random.randint(0, 100)
    load = random.randint(0, 100)
    form_decay = random.randint(0, 40)

    # Risk formula (important)
    risk = (
        (180 - knee) * 0.3 +
        fatigue * 0.4 +
        (100 - recovery) * 0.2 +
        form_decay * 0.5
    )

    risk = min(max(risk, 0), 100)

    data.append([knee, hip, back, fatigue, recovery, load, form_decay, risk])

df = pd.DataFrame(data, columns=[
    "knee_angle", "hip_angle", "back_angle",
    "fatigue", "recovery", "load", "form_decay", "risk"
])

df.to_csv("data/data.csv", index=False)

print("Dataset generated!")