document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".toolbox").forEach(box => {
        if (box.id !== "gas-ideal-tool") return;

        const canvas = box.querySelector("#gasChart");
        const btnUpdate = box.querySelector(".generate-btn");
        const selectX = box.querySelector(".axis-x");
        const selectY = box.querySelector(".axis-y");
        const selectNum = box.querySelector(".num-curves");
        const paramContainer = box.querySelector("#param-container");
        
        const R = 0.08314;
        let chartInstance = null;
        const axisLabels = { p: 'p / bar', V: 'V / L', T: 'T / K', n: 'n / mol' };

        // Função para redesenhar a tabela de parâmetros (Substitui o v-if do Vue)
        function renderParamTable() {
            const axisX = selectX.value;
            const axisY = selectY.value;
            const num = parseInt(selectNum.value);
            
            let html = `<table style="width: 100%; text-align: center; border-collapse: collapse;">
                        <tr><th>Var.</th>`;
            for(let i=1; i<=num; i++) html += `<th>C${i}</th>`;
            html += `</tr>`;

            const variables = [
                { id: 'p', label: 'p (bar)', step: '0.1', val: '1.0' },
                { id: 'V', label: 'V (L)', step: '1', val: '10.0' },
                { id: 'T', label: 'T (K)', step: '10', val: '300' },
                { id: 'n', label: 'n (mol)', step: '0.1', val: '1.0' }
            ];

            variables.forEach(v => {
                // SÓ mostra a linha se a variável NÃO for Eixo X nem Eixo Y
                if (v.id !== axisX && v.id !== axisY) {
                    html += `<tr><td style="font-weight:bold; padding:5px;">${v.label}</td>`;
                    for(let i=0; i<num; i++) {
                        html += `<td><input type="number" class="${v.id.toLowerCase()}-${i}" value="${v.val}" step="${v.step}" style="width:90%"></td>`;
                    }
                    html += `</tr>`;
                }
            });
            html += `</table>`;
            paramContainer.innerHTML = html;
        }

        function getPoints(setIndex, config) {
            const points = [];
            const step = (config.rangeXMax - config.rangeXMin) / 100;
            
            // Captura valores dos inputs gerados dinamicamente
            const getVal = (id) => {
                const el = box.querySelector(`.${id.toLowerCase()}-${setIndex}`);
                return el ? parseFloat(el.value) : 0;
            };

            const s = { p: getVal('p'), V: getVal('V'), T: getVal('T'), n: getVal('n') };

            for (let i = 0; i <= 100; i++) {
                let xValue = config.rangeXMin + (step * i);
                if (xValue <= 0) continue;

                let state = { ...s };
                state[config.axisX] = xValue;

                let yValue = 0;
                if (config.axisY === 'p') yValue = (state.n * R * state.T) / state.V;
                else if (config.axisY === 'V') yValue = (state.n * R * state.T) / state.p;
                else if (config.axisY === 'T') yValue = (state.p * state.V) / (state.n * R);
                else if (config.axisY === 'n') yValue = (state.p * state.V) / (R * state.T);

                points.push({ x: xValue, y: yValue });
            }
            return points;
        }

        function updateChart() {
            const config = {
                axisX: selectX.value,
                axisY: selectY.value,
                numCurves: parseInt(selectNum.value),
                rangeXMin: parseFloat(box.querySelector(".xmin").value),
                rangeXMax: parseFloat(box.querySelector(".xmax").value),
                rangeYMin: parseFloat(box.querySelector(".ymin").value),
                rangeYMax: parseFloat(box.querySelector(".ymax").value)
            };

            if (config.axisX === config.axisY) return;

            const colors = ['#2980b9', '#e74c3c', '#27ae60'];
            const datasets = [];

            for (let i = 0; i < config.numCurves; i++) {
                datasets.push({
                    label: `Curva ${i + 1}`,
                    data: getPoints(i, config),
                    borderColor: colors[i],
                    tension: 0.3,
                    pointRadius: 0
                });
            }

            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(canvas.getContext('2d'), {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { type: 'linear', title: { display: true, text: axisLabels[config.axisX] }, min: config.rangeXMin, max: config.rangeXMax },
                        y: { title: { display: true, text: axisLabels[config.axisY] }, min: config.rangeYMin, max: config.rangeYMax }
                    }
                }
            });
        }

        // Listeners para reatividade
        [selectX, selectY, selectNum].forEach(el => el.addEventListener("change", renderParamTable));
        btnUpdate.addEventListener("click", updateChart);

        // Inicialização
        renderParamTable();
        updateChart();
    });
});
