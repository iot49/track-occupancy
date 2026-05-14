# Track Occupancy Detection

An integrated suite of tools for model railroaders to detect track occupancy using computer vision and neural networks.


## 🌟 Overview

This project provides a robust, camera-based solution for track occupancy detection in model railroads. Unlike traditional sensors, this system uses overhead cameras and machine learning to identify the presence of trains at specific locations, ensuring high reliability regardless of lighting conditions or track geometry.

## Components

* Model Railroad: `../trackplans/oval-kato.layout`

* RocRail:
    * Start RocRail and open workspace `../rocrail-ws`
    * Control Blue10

* track-occupancy
  * cnn
    * TRAIN.ipynb: 
      * run to train classifier and exports to `cnn/models`
      * **TODO**: quantize to int8
    * TEST-CNN.ipynb: 
      * runs classifier on server (Kamrui Fanless PC N5100) on entire database
      * takes ~ 100ms/sample, ~2 min total
  * control
    * docker stack running on server Kamrui Fanless PC N5100
    * update with ../deploy.sh
    * accessed at *.rails.org; dns provided by CloudFlare but access is only local (see A record in CloudFlare DNS)
    * [Traefik](https://traefik.rails49.org)
    * [UI](https://ui.rails49.org)
      * fetches .r49 and live-view from server if connected
      * edit and save .r49 files
      * **IMPORTANT**: upload edited .r49 to server (from settings)
    * track-occupancy: fetches images from camera and runs classifier. API:
      * GET [Camera Snapshot](https://ui.rails49.org/api/snapshot)
      * GET/POST [.r49 file](https://ui.rails49.org/api/r49)
      * GET [cnn test](https://ui.rails49.org/api/test-cnn)
    * dcc-ex-bridge:
      * bridge dcc-ex controller between USB and MQTT and https://ui.rails49.org:2560 (rocrail, jmri, ...)
    * mqtt broker. Classification results published by track-occupancy
    * nginx, serves static content (ui, wasm libraries)
      
  * dataset
    * CNN training and validation data
    * raw images
    * .r49 files
    * extracted training data formatted for multi-label classification (labels coupler (implies train), train, track)
  * doc
    * legacy ... where should this go?
  * lib
    * classifier: unified classifier code used in ui and by server/track-occupancy detector
    * r49 schema and parser
    * uid: semi unique ids based on [snowflake](https://github.com/boser/snowflake)
      * used in rr-editor-view.js with nodeid
        * 1 = label (track, coupling, train)
        * 2 = image files
        * 3 = camera files
      
  * ui: static lit signle page web ui

  * `deploy.sh`
    * updates the code on the server and restarts the containers



