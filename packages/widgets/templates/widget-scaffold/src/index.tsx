import type { WidgetDefinition } from "@open-edu/widgets";

const myWidget: WidgetDefinition = {
  id: "my-widget-id",
  version: "0.1.0",
  render(props) {
    const { config, complete } = props;
    return null; // replace with implementation
  },
};

export default myWidget;
