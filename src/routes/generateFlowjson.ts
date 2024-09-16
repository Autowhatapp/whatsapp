import express from 'express';
import cors from 'cors';
import { Router, Request, Response } from 'express';
const app = express();
const router = Router();


app.use(express.json());
app.use(cors());

interface Component {
  type: string;
  label?: string;
  name?: string;
  text?: string;
  options?: string[];
  required?: boolean;
}

interface Screen {
  id: string;
  title: string;
  components: Component[];
}

interface Schema {
  screens: Screen[];
}

const generateFlowJSON = (schema: Schema) => {
  const screens: any[] = [];
  const routingModel: { [key: string]: string[] } = {};

  if (schema.screens.length > 8) {
    throw new Error('Maximum number of screens (8) exceeded.');
  }

  const truncateLabel = (label: string | undefined): string | undefined => {
    if (label && label.length > 20) {
      console.warn(`Warning: Label "${label}" truncated to 20 characters.`);
      return label.substring(0, 20);
    }
    return label;
  };

  const createComponent = (component: Component, index: number, screenId: string): any => {
    if (!component.name && !['text', 'heading', 'subheading', 'caption'].includes(component.type)) {
      throw new Error(`Component missing name: ${JSON.stringify(component)}`);
    }

    const uniqueName = component.name
      ? `${screenId}_${component.name.replace(/\s+/g, '_')}_${index}`
      : `unnamed_${index}`;

    switch (component.type) {
      case 'text':
        return { type: 'TextBody', text: component.text };
      case 'heading':
        return { type: 'TextHeading', text: component.text };
      case 'subheading':
        return { type: 'TextSubheading', text: component.text };
      case 'caption':
        return { type: 'TextCaption', text: component.text };
      case 'radio':
        return {
          type: 'RadioButtonsGroup',
          label: truncateLabel(component.label),
          name: uniqueName,
          'data-source': component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, '_').toLowerCase()}`,
            title: option
          })),
          required: component.required || false
        };
      case 'textarea':
        return {
          type: 'TextArea',
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false
        };
      case 'input':
        return {
          type: 'TextInput',
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
          'input-type': 'text'
        };
      case 'date':
        return {
          type: 'DatePicker',
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false
        };
      case 'dropdown':
        return {
          type: 'Dropdown',
          label: truncateLabel(component.label),
          name: uniqueName,
          'data-source': component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, '_').toLowerCase()}`,
            title: option
          })),
          required: component.required || false
        };
      case 'checkbox':
        return {
          type: 'CheckboxGroup',
          label: truncateLabel(component.label),
          name: uniqueName,
          'data-source': component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, '_').toLowerCase()}`,
            title: option
          })),
          required: component.required || false
        };
    }
  };

  const collectPreviousData = (currentIndex: number, forDataField = false): { [key: string]: any } => {
    return schema.screens.slice(0, currentIndex).flatMap(screen =>
      screen.components.map((component, i) => {
        if (component.name) {
          const key = `${screen.id}_${component.name.replace(/\s+/g, '_')}_${i}`;
          let value;
          if (forDataField) {
            if (component.type === 'checkbox') {
              value = {
                type: 'array',
                items: { type: 'string' },
                '__example__': []
              };
            } else {
              value = { type: 'string', '__example__': 'Example' };
            }
          } else {
            value = `\${data.${key}}`;
          }
          return [key, value];
        }
        return [];
      })
    ).reduce((acc: { [key: string]: any }, [key, value]) => {
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {});
  };

  const createScreen = (screenData: Screen, index: number, totalScreens: number): any => {
    const isTerminal = index === totalScreens - 1;

    if (screenData.components.length > 8) {
      throw new Error(`Screen ${screenData.id} exceeds maximum number of components (8).`);
    }

    const screenComponents = screenData.components
      .map((comp, i) => createComponent(comp, i, screenData.id))
      .filter(component => component !== null);

    const componentNames = screenData.components
      .map((component, i) => component.name
        ? `${screenData.id}_${component.name.replace(/\s+/g, '_')}_${i}`
        : null
      )
      .filter((name): name is string => name !== null);

    const screenPayload = componentNames.reduce((acc: { [key: string]: string }, name) => {
      acc[name] = `\${form.${name}}`;
      return acc;
    }, {});

    const screen = {
      id: screenData.id,
      title: screenData.title,
      data: collectPreviousData(index, true),
      terminal: isTerminal,
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'Form',
            name: 'flow_path',
            children: [
              ...screenComponents,
              {
                type: 'Footer',
                label: isTerminal ? 'Done' : 'Continue',
                'on-click-action': isTerminal
                  ? {
                    name: 'complete',
                    payload: {
                      ...collectPreviousData(totalScreens),
                      ...screenPayload
                    }
                  }
                  : {
                    name: 'navigate',
                    next: { type: 'screen', name: schema.screens[index + 1].id },
                    payload: {
                      ...collectPreviousData(index + 1),
                      ...screenPayload
                    }
                  }
              }
            ]
          }
        ]
      }
    };

    if (!isTerminal) {
      routingModel[screenData.id] = [schema.screens[index + 1].id];
    }

    return screen;
  };

  schema.screens.forEach((screenData, index) => {
    const screen = createScreen(screenData, index, schema.screens.length);
    if (screen) {
      screens.push(screen);
    }
  });

  if (screens.length !== schema.screens.length) {
    throw new Error('Some screens were invalid. Flow JSON not generated.');
  }

  return {
    version: '3.1',
    data_api_version: '3.0',
    routing_model: routingModel,
    screens: screens
  };
};

app.post('/generate-json', (req: Request, res: Response) => {
  try {
    const schema: Schema = req.body;
    const flowJSON = generateFlowJSON(schema);
    res.json(flowJSON);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

export default router;