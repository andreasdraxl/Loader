import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
import * as OBC from "@thatopen/components";

const container = document.getElementById("container")!;

const components = new OBC.Components();
const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

components.init();
world.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);
world.scene.setup();

const grids = components.get(OBC.Grids);
grids.create(world);

world.scene.three.background = null;

const fragments = components.get(OBC.FragmentsManager);
const fragmentIfcLoader = components.get(OBC.IfcLoader);

await fragmentIfcLoader.setup();

const excludedCats = [
  WEBIFC.IFCTENDONANCHOR,
  WEBIFC.IFCREINFORCINGBAR,
  WEBIFC.IFCREINFORCINGELEMENT,
];

for (const cat of excludedCats) {
  fragmentIfcLoader.settings.excludedCategories.add(cat);
}

fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

// 🆕 BoundingBoxer-Manager initialisieren
const fragmentBbox = components.get(OBC.BoundingBoxer);
let bbox: THREE.Mesh | null = null;

// 🆕 Funktion zum Laden einer IFC-Datei mit BoundingBox
async function loadIfc() {
  return new Promise<void>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ifc";
    input.style.display = "none";

    input.addEventListener("change", async (event) => {
      const fileInput = event.target as HTMLInputElement;
      if (!fileInput.files || fileInput.files.length === 0) return;

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        if (!e.target || !e.target.result) return;
        const buffer = new Uint8Array(e.target.result as ArrayBuffer);
        const model = await fragmentIfcLoader.load(buffer);
        model.name = file.name;
        world.scene.three.add(model);

        // 🆕 BoundingBox erstellen
        fragmentBbox.add(model);
        bbox = fragmentBbox.getMesh();
        fragmentBbox.reset();

        resolve();
      };

      reader.readAsArrayBuffer(file);
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

// 🆕 Kamera an Bounding Box anpassen
function fitToBIMModel() {
  if (bbox) {
    world.camera.controls.fitToSphere(bbox, true);
  }
}

BUI.Manager.init();

const panel = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
  <bim-panel active label="IFC Loader Tutorial" class="options-menu">
    <bim-panel-section collapsed label="Controls">
      <bim-panel-section style="padding-top: 12px;">
      
        <bim-button label="Load IFC"
          @click="${() => {
            loadIfc();
          }}">
        </bim-button>  
            
        <bim-button label="Export fragments"
          @click="${() => {
            exportFragments();
          }}">
        </bim-button>  
            
        <bim-button label="Dispose fragments"
          @click="${() => {
            disposeFragments();
          }}">
        </bim-button>

        <bim-button 
          label="Fit BIM model" 
          @click="${() => {
            fitToBIMModel();
          }}">  
        </bim-button>  
      
      </bim-panel-section>
      
    </bim-panel>
  `;
});

document.body.append(panel);

function download(file: File) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function exportFragments() {
  if (!fragments.groups.size) {
    return;
  }
  const group = Array.from(fragments.groups.values())[0];
  const data = fragments.export(group);
  download(new File([new Blob([data])], "small.frag"));

  const properties = group.getLocalProperties();
  if (properties) {
    download(new File([JSON.stringify(properties)], "small.json"));
  }
}

function disposeFragments() {
  fragments.dispose();
}

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());
