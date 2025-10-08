import { Component } from "@angular/core";
import { SideBarComponent } from "../../components/side-bar/side-bar.component";

@Component({
    selector:'home-page',
    templateUrl:'./home.component.html',
    styleUrls:['./home.component.css'],
    imports:[SideBarComponent]
})
export class Home {}