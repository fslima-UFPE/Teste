function createMCSimulation(box) {

    // =========================
    // CHARTS
    // =========================
    const energyChart = new Chart(box.querySelector("#energyChart"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "Energy (kJ/mol)", data: [], borderWidth: 2, pointRadius: 0 }] },
        options: { animation: false }
    });

    const pressureChart = new Chart(box.querySelector("#pressureChart"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "Pressure (bar)", data: [], borderWidth: 2, pointRadius: 0 }] },
        options: { animation: false }
    });

    const histChart = new Chart(box.querySelector("#histChart"), {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Energy histogram (kJ/mol)", data: [] }] },
        options: { animation: false }
    });

    // =========================
    // CONSTANTS
    // =========================
    const R = 0.0083145;
    const Rj = 8.3145;
    const kB = 138.0649;

    let state = null;

    // =========================
    // POTENTIALS
    // =========================
    function LJ(dr, eps, sig) {
        const s = sig / dr;
        const s2 = s * s;
        const s6 = s2 * s2 * s2;
        const s12 = s6 * s6;

        return {
            en: 4 * eps * (s12 - s6),
            xi: 24 * eps * (2 * s12 - s6)
        };
    }

    function dist(a, b, box) {
        let dx = a[0] - b[0];
        let dy = a[1] - b[1];
        let dz = a[2] - b[2];

        dx -= Math.round(dx / box) * box;
        dy -= Math.round(dy / box) * box;
        dz -= Math.round(dz / box) * box;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // =========================
    // INIT
    // =========================
    function initSimulation(p) {

        const positions = [];
        const ngrid = Math.ceil(Math.cbrt(p.N));
        const spacing = p.boxSize / ngrid;

        let count = 0;
        for (let x = 0; x < ngrid; x++) {
            for (let y = 0; y < ngrid; y++) {
                for (let z = 0; z < ngrid; z++) {
                    if (count >= p.N) break;

                    positions.push([
                        (x + 0.5) * spacing,
                        (y + 0.5) * spacing,
                        (z + 0.5) * spacing
                    ]);
                    count++;
                }
            }
        }

        return {
            positions,
            energy: 0,
            xi: 0,
            step: 0,
            eqStart: Math.floor(0.2 * p.maxSteps),

            meanE: 0,
            M2E: 0,
            meanP: 0,
            count: 0,

            hist: [],

            ...p,

            dx: p.dx ?? 5,

            V: p.boxSize ** 3,
            pid: p.N * kB * p.T / (p.boxSize ** 3),
            pcoef: kB / (p.T * (p.boxSize ** 3)),

            sampleEvery: Math.max(1, Math.floor(p.maxSteps / 300))
        };
    }

    // =========================
    // RESET
    // =========================
    function resetCharts() {

        energyChart.data.labels = [];
        energyChart.data.datasets[0].data = [];

        pressureChart.data.labels = [];
        pressureChart.data.datasets[0].data = [];

        histChart.data.labels = [];
        histChart.data.datasets[0].data = [];
    }

    // =========================
    // STATS
    // =========================
    function updateStats(s) {

        if (s.step < s.eqStart) return;

        let E = 0;
        let P = 0;

        s.count++;

        if (s.species.type === "IG") {

            P = s.pid;

        } else if (s.species.type === "HS") {

            const sigma = s.species.sig;
            const rho = s.N / s.V;

            const eta = (Math.PI / 6) * rho * sigma ** 3;
            const Z = (1 + eta + eta ** 2 - eta ** 3) / (1 - eta) ** 3;

            s.eta = eta;
            s.Z = Z;

            P = s.pid * Z;

        } else {

            const E_dim = s.energy;
            E = R * E_dim;

            P = s.xi * s.pcoef + s.pid;

            const delta = E_dim - s.meanE;
            s.meanE += delta / s.count;
            s.M2E += delta * (E_dim - s.meanE);
        }

        s.meanP += (P - s.meanP) / s.count;

        if (s.step > s.eqStart && s.step % 10 === 0) {
            s.hist.push(E);
        }

        if (s.step % s.sampleEvery === 0) {
            energyChart.data.labels.push(s.step);
            energyChart.data.datasets[0].data.push(E);

            pressureChart.data.labels.push(s.step);
            pressureChart.data.datasets[0].data.push(P);
        }
    }

    // =========================
    // FINALIZE
    // =========================
    function finalize(s) {

        const avgE = R * s.meanE;
        const avgP = s.meanP;

        const varianceE = (s.count > 1)
            ? s.M2E / (s.count - 1)
            : 0;

        const cv_real = (varianceE / (s.N * s.T * s.T)) * Rj;
        const cv_ideal = 1.5 * Rj;

        box.querySelector(".results").innerHTML =
            `⟨E⟩ = ${avgE.toFixed(2)} kJ/mol |
             ⟨P⟩ = ${avgP.toFixed(2)} bar <br>
             Cv(real) = ${cv_real.toFixed(2)} |
             Cv(ideal) = ${cv_ideal.toFixed(2)} |
             Cv(total) = ${(cv_real + cv_ideal).toFixed(2)}`;

        renderHistogram(s);
    }

    // =========================
    // HISTOGRAM
    // =========================
    function renderHistogram(s) {

        if (s.hist.length === 0) return;

        const bins = 50;

        let min = Math.min(...s.hist);
        let max = Math.max(...s.hist);

        if (Math.abs(max - min) < 1e-12) max = min + 1e-6;

        const hist = new Array(bins).fill(0);

        for (let v of s.hist) {
            let i = Math.floor((v - min) / (max - min) * bins);
            if (i < 0) i = 0;
            if (i >= bins) i = bins - 1;
            hist[i]++;
        }

        const norm = hist.map(v => v / s.hist.length);

        const labels = Array.from({ length: bins }, (_, i) =>
            (min + (i + 0.5) * (max - min) / bins).toFixed(2)
        );

        histChart.data.labels = labels;
        histChart.data.datasets[0].data = norm;
        histChart.update();
    }

    // =========================
    // RUNNERS (CLEAN SEPARATION)
    // =========================
    function runIG(s) {

        const P = s.pid;

        for (let i = 0; i < 100; i++) {
            energyChart.data.labels.push(i);
            energyChart.data.datasets[0].data.push(0);

            pressureChart.data.labels.push(i);
            pressureChart.data.datasets[0].data.push(P);
        }

        energyChart.update();
        pressureChart.update();
    }

    function runHS(s) {

        const sigma = s.species.sig;
        const rho = s.N / s.V;

        const eta = (Math.PI / 6) * rho * sigma ** 3;
        const Z = (1 + eta + eta ** 2 - eta ** 3) / (1 - eta) ** 3;

        const P = s.pid * Z;

        for (let i = 0; i < 100; i++) {
            energyChart.data.labels.push(i);
            energyChart.data.datasets[0].data.push(0);

            pressureChart.data.labels.push(i);
            pressureChart.data.datasets[0].data.push(P);
        }

        energyChart.update();
        pressureChart.update();
    }

    function runLJ(s) {

        function loop() {

            for (let i = 0; i < 200; i++) {
                mcStep(s);
                s.step++;
                updateStats(s);

                if (s.step >= s.maxSteps) {
                    finalize(s);
                    return;
                }
            }

            energyChart.update();
            pressureChart.update();

            requestAnimationFrame(loop);
        }

        loop();
    }

    // =========================
    // MAIN ENTRY
    // =========================
    function run(params) {

        state = initSimulation(params);
        resetCharts();

        const type = state.species.type;

        if (type === "IG") return runIG(state);
        if (type === "HS") return runHS(state);
        return runLJ(state);
    }

    // expose
    return { run };
}
