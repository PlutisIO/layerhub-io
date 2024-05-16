import Canvas from "./canvas"
import State from "./state"
import Frame from "./controllers/Frame"
import Zoom from "./controllers/Zoom"
import History from "./controllers/History"
import Objects from "./controllers/Objects"
import Events from "./controllers/Events"
import EventManager from "./event-manager"
import Scene from "./controllers/Scene"
import Renderer from "./controllers/Renderer"
import Personalization from "./controllers/Personalization"
import { EditorState } from "./common/interfaces"
import { defaultEditorConfig } from "./common/constants"
import Guidelines from "./controllers/Guidelines"
import { EditorConfig } from "@layerhub-plutis-io/types"
import { fabric } from "fabric"

export class Editor extends EventManager {
  public canvas: Canvas
  public frame: Frame
  public zoom: Zoom
  public history: History
  public objects: Objects
  public scene: Scene
  public renderer: Renderer
  public state: EditorState
  public config: EditorConfig
  public canvasId: string
  protected events: Events
  protected personalization: Personalization
  protected guidelines: Guidelines
  constructor({ id, state, config }: { id: string; state?: EditorState; config: Partial<EditorConfig> }) {
    super()
    this.state = state ? state : new State()
    this.config = {
      ...defaultEditorConfig,
      ...config,
      id,
    }
    this.canvasId = id
    this.initializeCanvas()
    this.initializeControllers()
    this.state.setEditor(this)
  }

  public initializeCanvas = () => {
    const canvas = new Canvas({
      id: this.canvasId,
      config: this.config,
      editor: this,
    })
    canvas.canvas.on('mouse:dblclick', function(options: any) {
      function ungroup (group: any) {
        groupItems = group._objects;
        group._restoreObjectsState();
        canvas.canvas.remove(group);
        for (var i = 0; i < groupItems.length; i++) {
            if(groupItems[i] != "StaticText"){
                groupItems[i].selectable = false;
            }                               
            canvas.canvas.add(groupItems[i]);
        }
        canvas.canvas.renderAll();
      };
      var groupItems: any;
      if (options.target) {
        var thisTarget = options.target; 
        var mousePos = canvas.canvas.getPointer(options.e);
        var editTextbox = false;
        var editObject;
    
        if (thisTarget.isType('group')) {
          var groupPos = {
            x: thisTarget.left,
            y: thisTarget.top
          }
  
          thisTarget.forEachObject(function(object: any, i: any) {
            console.log(object.type);
            if(object.type == "StaticText"){           
              var matrix = thisTarget.calcTransformMatrix();
              const currPoint: any = {y: object.top, x: object.left};
              var newPoint = fabric.util.transformPoint(currPoint, matrix);
              var objectPos = {
                xStart: newPoint.x - (object.width * object.scaleX) / 2,//When OriginX and OriginY are centered, otherwise xStart: newpoint.x - object.width * object.scaleX etc...
                xEnd: newPoint.x + (object.width * object.scaleX) / 2,
                yStart: newPoint.y - (object.height * object.scaleY) / 2,
                yEnd: newPoint.y + (object.height * object.scaleY) / 2
              }

              if ((mousePos.x >= objectPos.xStart && mousePos.x <= objectPos.xEnd) && (mousePos.y >= objectPos.yStart && mousePos.y <= objectPos.yEnd)) {
                  

                ungroup(thisTarget);
                canvas.canvas.setActiveObject(object);

                object.enterEditing();
                object.selectAll();

                editObject = object;
                var exitEditing = true;

                editObject.on('editing:exited', function (options: any) {
                  if(exitEditing){
                    var items: any = [];
                    groupItems.forEach(function (obj: any) {
                      const newObj = obj;
                      newObj.selectable = true;
                      items.push(newObj);
                      canvas.canvas.remove(obj);
                    });

                    var grp
                    grp = new fabric.Group(items, {});
                    canvas.canvas.add(grp);
                    exitEditing = false;
                  }
                });
              }
            }
          });
        }    
      }
    });
    this.canvas = canvas
  }

  public initializeControllers = () => {
    const options = {
      canvas: this.canvas.canvas,
      editor: this,
      config: this.config,
      state: this.state,
    }
    this.frame = new Frame(options)
    this.zoom = new Zoom(options)
    this.history = new History(options)
    this.objects = new Objects(options)
    this.events = new Events(options)
    this.personalization = new Personalization(options)
    this.scene = new Scene(options)
    this.guidelines = new Guidelines(options)
    this.renderer = new Renderer()
  }

  public debug() {
    console.log({
      objects: this.canvas.canvas.getObjects(),
      json: this.canvas.canvas.toJSON(),
    })
  }

  public destroy() {
    this.canvas.destroy()
  }
  // CONTEXT MENU
  public cancelContextMenuRequest = () => {
    this.state.setContextMenuRequest(null)
  }
}
