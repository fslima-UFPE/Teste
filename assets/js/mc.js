function createMCSimulation(box) {

    const energyChart = new Chart(box.querySelector("#energyChart"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Energy (kJ/mol)",
                data: [],
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: { animation: false }
    });

    const pressureChart = new Chart(box.querySelector("#pressureChart"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Pressure (bar)",
                data: [],
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: { animation: false }
    });

    const histChart = new Chart(box.querySelector("#histChart"), {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Energy histogram (kJ/mol)", data: [] }] },
        options: { animation: false }
    });

    const R = 0.0083145;   // kJ/mol/K
    const Rj = 8.3145;     // J/mol/K
    const kB = 1.380649e-23;

    let state = null;

    function LJ(dr, eps, sig) {
        const s = sig / dr;
        const s2 = s*s;
        const s6 = s2*s2*s2;
        const s12 = s6*s6;

        return {
            en: 4 * eps * (s12 - s6),   // K units
            xi: 24 * eps * (2*s12 - s6)
        };
    }

    function dist(a, b, box) {
        let dx = a[0]-b[0];
        let dy = a[1]-b[1];
        let dz = a[2]-b[2];

        dx -= Math.round(dx/box)*box;
        dy -= Math.round(dy/box)*box;
        dz -= Math.round(dz/box)*box;

        return Math.sqrt(dx*dx+dy*dy+dz*dz);
    }

    function initSimulation(p) {

        const positions = [];
        const ngrid = Math.ceil(Math.cbrt(p.N));
        const spacing = p.boxSize / ngrid;

        let count = 0;
        for (let x=0;x<ngrid;x++){
            for (let y=0;y<ngrid;y++){
                for (let z=0;z<ngrid;z++){
                    if (count >= p.N) break;

                    positions.push([
                        (x+0.5)*spacing,
                        (y+0.5)*spacing,
                        (z+0.5)*spacing
                    ]);

                    count++;
                }
            }
        }

        let energy = 0;
        let xi = 0;

        for (let i=0;i<p.N;i++){
            for (let j=i+1;j<p.N;j++){
                const dr = dist(positions[i], positions[j], p.boxSize);
                const res = LJ(dr, p.species.eps, p.species.sig);
                energy += res.en;
                xi += res.xi;
            }
        }

        return {
            positions,
            energy,
            xi,
            step: 0,
            eqStart: Math.floor(0.2*p.maxSteps),

            // Welford variables (numerically stable!)
            meanE: 0,
            M2E: 0,
            meanP: 0,
            count: 0,

            hist: [],

            ...p,
            pcoef: kB/(p.T*(p.boxSize**3*1e-27)),
            pid: 0.01*p.N*kB*p.T/(p.boxSize**3*1e-27),

            sampleEvery: Math.max(1, Math.floor(p.maxSteps / 300))
        };
    }

    function mcStep(s) {

        const i = Math.floor(Math.random()*s.N);
        const old = [...s.positions[i]];

        let newPos = old.map(v => v + (Math.random()-0.5)*s.dx);
        newPos = newPos.map(v => (v+s.boxSize)%s.boxSize);

        let dE = 0;
        let dXi = 0;

        for (let j=0;j<s.N;j++){
            if (j===i) continue;

            const drOld = dist(old, s.positions[j], s.boxSize);
            const drNew = dist(newPos, s.positions[j], s.boxSize);

            const oldRes = LJ(drOld, s.species.eps, s.species.sig);
            const newRes = LJ(drNew, s.species.eps, s.species.sig);

            dE += newRes.en - oldRes.en;
            dXi += newRes.xi - oldRes.xi;
        }

        if (dE < 0 || Math.random() < Math.exp(-dE/s.T)) {
            s.positions[i] = newPos;
            s.energy += dE;
            s.xi += dXi;
        }
    }

    function updateStats(s) {

        if (s.step < s.eqStart) return;

        const E_dim = s.energy;           // K
        const E = R * E_dim;              // kJ/mol
        const P = s.xi*s.pcoef + s.pid;

        // Welford update (stable variance!)
        s.count++;
        const delta = E_dim - s.meanE;
        s.meanE += delta / s.count;
        s.M2E += delta * (E_dim - s.meanE);

        s.meanP += (P - s.meanP) / s.count;

        s.hist.push(E);

        if (s.step % s.sampleEvery === 0) {
            energyChart.data.labels.push(s.step);
            energyChart.data.datasets[0].data.push(E);

            pressureChart.data.labels.push(s.step);
            pressureChart.data.datasets[0].data.push(P);
        }
    }

    function finalize(s) {

    if (s.count === 0) {
        box.querySelector(".results").innerHTML =
            "No data collected (increase steps or check equilibration).";
        return;
    }

    // Mean energy (dimensionless → convert to kJ/mol)
    const avgE = R * s.meanE;

    // Mean pressure
    const avgP = s.meanP;

    // Variance (dimensionless energy)
    const varE = s.M2E / s.count;

    // Cv (real part)
    const cvm = (varE) / (s.N * s.T * s.T) * Rj;

    // Ideal gas contribution
    const cvid = 1.5 * Rj;

    box.querySelector(".results").innerHTML =
        `⟨E⟩ = ${avgE.toFixed(2)} kJ/mol |
         ⟨P⟩ = ${avgP.toFixed(2)} bar |
         Cv = ${(cvm + cvid).toFixed(2)} J/(K·mol)
         (real: ${cvm.toFixed(2)} J/(K·mol))`;

    // =========================
    // Histogram (unchanged)
    // =========================

    const data = s.hist;
    if (data.length < 10) return;

    const bins = 40;

    let min = data[0];
    let max = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
    }

    if (Math.abs(max - min) < 1e-10) {
        max = min + 1e-6;
    }

    const hist = new Array(bins).fill(0);

    for (let i = 0; i < data.length; i++) {
        let idx = Math.floor((data[i] - min) / (max - min) * bins);
        if (idx < 0) idx = 0;
        if (idx >= bins) idx = bins - 1;
        hist[idx]++;
    }

    const total = data.length;
    const histNorm = hist.map(v => v / total);

    const labels = [];
    for (let i = 0; i < bins; i++) {
        labels.push(
            (min + (i + 0.5) * (max - min) / bins).toFixed(2)
        );
    }

    histChart.data.labels = labels;
    histChart.data.datasets[0].data = histNorm;
    histChart.update();
}

    function run(params) {

        state = initSimulation(params);

        energyChart.data.labels = [];
        energyChart.data.datasets[0].data = [];

        pressureChart.data.labels = [];
        pressureChart.data.datasets[0].data = [];

        function loop() {

            for (let i=0;i<200;i++) {
                mcStep(state);
                state.step++;
                updateStats(state);

                if (state.step >= state.maxSteps) {
                    finalize(state);
                    return;
                }
            }

            energyChart.update();
            pressureChart.update();

            requestAnimationFrame(loop);
        }

        loop();
    }

    return { run };
}

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".toolbox").forEach(box => {
        if (box.id !== "mc-tool") return;

        const sim = createMCSimulation(box);

        const speciesDB = {
            Xe: { eps: 218.18, sig: 4.055 },
            Ar: { eps: 116.81, sig: 3.401 },
            Ne: { eps: 36.831, sig: 2.775 },
            He: { eps: 5.465, sig: 2.628 },
            HS: { eps: 0.0001, sig: 4.0 },
            IG: { eps: 0.000001, sig: 1.0 }
        };

        box.querySelector(".jsbox-btn-primary").addEventListener("click", () => {

            sim.run({
                N: parseInt(box.querySelector(".npart").value),
                boxSize: parseFloat(box.querySelector(".box").value),
                T: parseFloat(box.querySelector(".temp").value),
                dx: parseFloat(box.querySelector(".dx").value),
                maxSteps: parseInt(box.querySelector(".steps").value),
                species: speciesDB[box.querySelector(".species").value]
            });

        });
    });

});
