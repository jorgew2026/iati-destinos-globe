(function () {
  "use strict";

  const markets = {
    ES: "España",
    PT: "Portugal",
    IT: "Italia",
    LATAM: "LATAM",
    ROW: "Resto del mundo"
  };
  const views = [["ALL", "Todos los mercados"], ...Object.entries(markets)];
  const element = id => document.getElementById(id);
  const snapshot = JSON.parse(element("snapshot").textContent);
  const formatter = new Intl.NumberFormat("es-ES", {useGrouping: "always"});
  const number = value => formatter.format(value);

  function aggregate(market) {
    const keys = market === "ALL" ? Object.keys(markets) : [market];
    const counts = new Map();
    let total = 0;
    for (const key of keys) {
      const data = snapshot.markets[key];
      if (!data) continue;
      total += data.policies;
      for (const [country, policies] of data.dest) {
        counts.set(country, (counts.get(country) || 0) + policies);
      }
    }
    const ranking = Array.from(counts).sort((a, b) => b[1] - a[1]);
    return {total, ranking};
  }

  function tiles(cell, value) {
    cell.replaceChildren();
    cell.setAttribute("aria-label", value.trim());
    for (const character of value) {
      const tile = document.createElement("span");
      tile.className = character === " " ? "tile blank" : "tile";
      tile.textContent = character;
      tile.setAttribute("aria-hidden", "true");
      cell.appendChild(tile);
    }
  }

  function renderRow(name, policies, position, amountWidth) {
    const row = document.createElement("div");
    row.className = "row";
    const destination = name.toLocaleUpperCase("es-ES");
    const columns = Math.max(16, Array.from(destination).length);
    const cells = [
      ["rank", String(position).padStart(2, "0")],
      ["destination", destination.padEnd(columns)],
      ["amount", number(policies).padStart(amountWidth)]
    ];
    for (const [className, value] of cells) {
      const cell = document.createElement("div");
      cell.className = "cells " + className;
      if (className === "destination") {
        cell.style.setProperty("--columns", columns);
      }
      tiles(cell, value);
      row.appendChild(cell);
    }
    return row;
  }

  function formatUpdatedAt() {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(snapshot.updatedAt);
    return match ? "Actualizado " + match[3] + "/" + match[2] + " · " + match[4] + " Madrid" : "";
  }

  window.renderAdmiraFrame = function (index) {
    const [key, label] = views[index];
    const {total, ranking} = aggregate(key);
    const title = element("title");
    title.textContent = label + " - Próximos Destinos";
    title.style.fontSize = "";
    element("destinations").textContent = number(ranking.length) +
      (ranking.length === 1 ? " destino en las pólizas de esta semana" : " destinos en las pólizas de esta semana");
    element("updated").textContent = formatUpdatedAt();
    tiles(element("total"), number(total));
    if (title.scrollWidth > title.clientWidth) {
      title.style.fontSize = Math.floor(57 * title.clientWidth / title.scrollWidth) + "px";
    }

    const board = element("board");
    board.replaceChildren();
    if (ranking.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aún no hay destinos registrados esta semana";
      board.appendChild(empty);
    } else {
      const amountWidth = Math.max(5, number(ranking[0][1]).length);
      ranking.slice(0, 5).forEach(([country, count], index) => {
        const row = renderRow(snapshot.names[country] || country, count, index + 1, amountWidth);
        board.appendChild(row);
        const destination = row.querySelector(".destination");
        const tileWidth = destination.firstElementChild.getBoundingClientRect().width;
        destination.style.setProperty("--letter-size", Math.min(44, Math.floor(tileWidth * 0.96)) + "px");
      });
    }
    return "Panel split-flap · " + label + " · " + number(total) + " pólizas esta semana";
  };
}());
