import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-text-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './text-box.component.html',
  styleUrls: ['./text-box.component.css']
})
export class TextBoxComponent {
  @Output() sendMessageChild = new EventEmitter<string>();
  menssageText = '';

  send() {
    if (this.menssageText.trim()) {
      this.sendMessageChild.emit(this.menssageText);
      this.menssageText = '';
    }
  }
}
