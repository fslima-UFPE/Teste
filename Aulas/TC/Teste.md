---
layout: TCclass
title: Teste de MC
subtitle: LJ particles
---

<p class="jt">
Vou ver se funciona.
</p>

<div class="toolbox" id="mc-tool">

  <div class="toolbox-header">
    <h2 class="toolbox-title">Monte Carlo Simulation (Lennard-Jones Mixture)</h2>
    <p class="toolbox-subtitle">Energy, Pressure, Heat Capacity & Histogram</p>
  </div>

  <div class="toolbox-content">

    <!-- CONTROLS -->
    <div class="jsbox-control-panel">
      <div class="jsbox-controls-grid">

        <!-- SYSTEM -->
        <div>
          <div class="jsbox-col-title sys">System</div>

          <div class="jsbox-input-row">
            <label>Box (Å)</label>
            <input type="number" class="jsbox-input box" value="50">
          </div>

          <div class="jsbox-input-row">
            <label>T (K)</label>
            <input type="number" class="jsbox-input temp" value="300">
          </div>

          <div class="jsbox-input-row">
            <label>dx (Å)</label>
            <input type="number" class="jsbox-input dx" value="5">
          </div>

          <div class="jsbox-input-row">
            <label>Steps</label>
            <input type="number" class="jsbox-input steps" value="200000">
          </div>

          <div class="jsbox-input-row">
            <label>Cutoff (σ)</label>
            <input type="number" class="jsbox-input cutoff" value="2.5" step="0.1">
          </div>
        </div>

        <!-- SPECIES 1 -->
        <div>
          <div class="jsbox-col-title p1">Species 1</div>

          <div class="jsbox-input-row">
            <label>Type</label>
            <select class="jsbox-input sp1">
              <option value="Xe">Xe</option>
              <option value="Ar">Ar</option>
              <option value="Ne">Ne</option>
              <option value="He">He</option>
              <option value="HS">Hard Sphere</option>
              <option value="IG">Ideal Gas</option>
            </select>
          </div>

          <div class="jsbox-input-row">
            <label>N₁</label>
            <input type="number" class="jsbox-input n1" value="60">
          </div>
        </div>

        <!-- SPECIES 2 -->
        <div>
          <div class="jsbox-col-title p2">Species 2</div>

          <div class="jsbox-input-row">
            <label>Type</label>
            <select class="jsbox-input sp2">
              <option value="None">None</option>
              <option value="Xe">Xe</option>
              <option value="Ar">Ar</option>
              <option value="Ne">Ne</option>
              <option value="He">He</option>
              <option value="HS">Hard Sphere</option>
              <option value="IG">Ideal Gas</option>
            </select>
          </div>

          <div class="jsbox-input-row">
            <label>N₂</label>
            <input type="number" class="jsbox-input n2" value="0">
          </div>
        </div>

        <!-- RUN BUTTON -->
        <div style="display:flex;align-items:flex-end;">
          <button class="jsbox-btn jsbox-btn-primary">Run Simulation</button>
        </div>

      </div>
    </div>

    <!-- PLOTS -->
    <div class="jsbox-vis-layout">

      <div class="jsbox-vis-right">

        <div class="jsbox-card">
          <div class="jsbox-card-header">Energy (kJ/mol)</div>
          <div class="jsbox-card-body">
            <canvas id="energyChart" class="jsbox-chart"></canvas>
          </div>
        </div>

        <div class="jsbox-card">
          <div class="jsbox-card-header">Pressure (bar)</div>
          <div class="jsbox-card-body">
            <canvas id="pressureChart" class="jsbox-chart"></canvas>
          </div>
        </div>

        <div class="jsbox-card">
          <div class="jsbox-card-header">Energy Histogram</div>
          <div class="jsbox-card-body">
            <canvas id="histChart" class="jsbox-chart"></canvas>
          </div>
        </div>

      </div>

    </div>

    <!-- RESULTS -->
    <div class="jsbox-alert results">
      Results will appear here
    </div>

  </div>
</div>
